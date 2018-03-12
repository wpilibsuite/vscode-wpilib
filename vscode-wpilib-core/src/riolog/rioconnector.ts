'use strict';

import * as net from 'net';
import * as timers from 'timers';
import * as jsonc from 'jsonc-parser';

async function properRace<T>(promises: Promise<T>[]): Promise<T> {
  if (promises.length < 1) {
    return Promise.reject('Can\'t start a race without promises!');
  }

  // There is no way to know which promise is rejected.
  // So we map it to a new promise to return the index when it fails
  let indexPromises = promises.map((p, index) => p.catch(() => { throw index; }));

  try {
    return await Promise.race(indexPromises);
  } catch (index) {
    // The promise has rejected, remove it from the list of promises and just continue the race.
    console.log('reject promise');
    let p = promises.splice(index, 1)[0];
    p.catch((e) => console.log('A promise has been rejected, but awaiting others', e));
    return await properRace(promises);
  }

}

interface IDriverStationData {
  robotIP: number;
}

const constantIps: string[] = [
  '172.22.11.2',
  '127.0.0.1'
];

const teamIps: string[] = [
  'roboRIO-TEAM-FRC.local',
  'roboRIO-TEAM-FRC.lan',
  'roboRIO-TEAM-FRC.frc-field.local'
];


interface ISocketPromisePair {
  socket: net.Socket;
  promise: Promise<net.Socket>;
  dispose(): void;
}

interface ICancellableTimer {
  promise: Promise<undefined>;
  cancel(): void;
}

function timerPromise(ms: number): ICancellableTimer {
  let timer: NodeJS.Timer | undefined;
  return {
    promise: new Promise((resolve, _) => {
      timer = timers.setTimeout(() => {
        resolve(undefined);
      }, ms);
    }),
    cancel() {
      if (timer === undefined) {
        return;
      }
      console.log('cancelled timer');
      timers.clearTimeout(timer);
    }
  };
}

class DSSocketPromisePair implements ISocketPromisePair {
  socket: net.Socket;
  promise: Promise<net.Socket>;
  private dsSocket: net.Socket;

  constructor(rs: net.Socket, ds: net.Socket, p: Promise<net.Socket>) {
    this.socket = rs;
    this.promise = p;
    this.dsSocket = ds;
  }

  dispose(): void {
    this.socket.emit('dispose');
    this.dsSocket.emit('dispose');
  }
}

function getSocketFromDS(port: number): ISocketPromisePair {
  let s = new net.Socket();
  let ds = new net.Socket();
  let retVal = new DSSocketPromisePair(s, ds, new Promise((resolve, reject) => {
    // First connect to ds, and wait for data
    ds.on('data', (data) => {
      let parsed: IDriverStationData = jsonc.parse(data.toString());
      if (parsed.robotIP === 0) {
        ds.end();
        ds.destroy();
        ds.removeAllListeners();
        reject();
        return;
      }
      let ipAddr = '';
      let ip = parsed.robotIP;
      ipAddr += ((ip >> 24) & 0xff) + '.';
      ipAddr += ((ip >> 16) & 0xff) + '.';
      ipAddr += ((ip >> 8) & 0xff) + '.';
      ipAddr += (ip & 0xff);
      s.on('error', (_) => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
        s.removeAllListeners();
        reject();
      });
      s.on('timeout', () => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
        s.removeAllListeners();
        reject();
      });
      s.on('close', () => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
        s.removeAllListeners();
        reject();
      });
      s.on('dispose', () => {
        console.log('disposed ds connected');
        reject();
        s.end();
        s.destroy();
        s.removeAllListeners();
      });
      s.connect(port, ipAddr, () => {
        s.removeAllListeners();
        resolve(s);
      });
      ds.end();
      ds.destroy();
      ds.removeAllListeners();
    });
    ds.on('error', () => {
      reject();
    });
    ds.on('dispose', () => {
      console.log('disposed ds');
      reject();
      ds.end();
      ds.destroy();
      ds.removeAllListeners();
    });
    ds.connect(1742, '127.0.0.1');
  }));
  return retVal;
}

function getSocketFromIP(port: number, ip: string): ISocketPromisePair {
  let s = new net.Socket();
  return {
    socket: s,
    promise: new Promise((resolve, reject) => {
      s.on('error', (_) => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
        s.removeAllListeners();
        reject();
      });
      s.on('timeout', () => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
        s.removeAllListeners();
        reject();
      });
      s.on('close', () => {
        s.end();
        s.destroy();
        s.removeAllListeners();
        reject();
      });
      s.on('dispose', () => {
        console.log('disposed', ip);
        reject();
        s.end();
        s.destroy();
        s.removeAllListeners();
      });
      s.connect(port, ip, () => {
        s.removeAllListeners();
        resolve(s);
      });
    }),
    dispose() {
      this.socket.emit('dispose');
    }
  };
}

export async function connectToRobot(port: number, teamNumber: number, timeout: number): Promise<net.Socket | undefined> {
  let pairs: ISocketPromisePair[] = [];
  teamNumber = Math.trunc(teamNumber);

  for (let c of constantIps) {
    pairs.push(getSocketFromIP(port, c));
  }
  for (let c of teamIps) {
    pairs.push(getSocketFromIP(port, c.replace('TEAM', teamNumber.toString())));
  }
  pairs.push(getSocketFromIP(port, `10.${Math.trunc(teamNumber / 100)}.${teamNumber % 100}.2`));
  pairs.push(getSocketFromDS(port));
  let connectors: Promise<net.Socket | undefined>[] = [];
  for (let p of pairs) {
    connectors.push(p.promise);
  }
  let timer = timerPromise(timeout);
  connectors.push(timer.promise);
  let firstDone: net.Socket | undefined = await properRace(connectors);
  if (firstDone === undefined) {
    // Kill all
    for (let p of pairs) {
      p.dispose();
      try {
        await p.promise;
      } catch {

      }
    }
  } else {
    // Kill all but me
    timer.cancel();
    for (let p of pairs) {
      if (firstDone !== p.socket) {
        p.dispose();
        try {
          await p.promise;
        } catch {

        }
      }
    }
  }
  return firstDone;
}
