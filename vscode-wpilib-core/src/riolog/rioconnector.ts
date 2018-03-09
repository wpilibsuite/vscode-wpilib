'use strict';
import * as net from 'net';
import * as timers from 'timers';
import * as jsonc from 'jsonc-parser';

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

function timerPromise(ms: number): Promise<undefined> {
  return new Promise((resolve, _) => {
    timers.setTimeout(() => {
      resolve(undefined);
    }, ms);
  });
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
    this.socket.end();
    this.socket.destroy();
    this.dsSocket.end();
    this.dsSocket.destroy();
  }
}

function getSocketFromDS(port: number): ISocketPromisePair {
  let s = new net.Socket();
  let ds = new net.Socket();
  let retVal = new DSSocketPromisePair(s, ds, new Promise((resolve, _) => {
    // First connect to ds, and wait for data
    ds.on('data', (data) => {
      let parsed: IDriverStationData = jsonc.parse(data.toString());
      if (parsed.robotIP === 0) {
        ds.destroy();
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
      });
      s.on('timeout', () => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
      });
      s.connect(port, ipAddr, () => {
        resolve(s);
      });
      ds.end();
      ds.destroy();
    });
    ds.connect(1742, '127.0.0.1');
  }));
  return retVal;
}

function getSocketFromIP(port: number, ip: string): ISocketPromisePair {
  let s = new net.Socket();
  return {
    socket: s,
    promise: new Promise((resolve, _) => {
      let s = new net.Socket();
      s.on('error', (_) => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
      });
      s.on('timeout', () => {
        console.log('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
      });
      s.connect(port, ip, () => {
        resolve(s);
      });
    }),
    dispose() {
      this.socket.end();
      this.socket.destroy();
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
  connectors.push(timerPromise(timeout));
  let firstDone = await Promise.race(connectors);
  if (firstDone === undefined) {
    // Kill all
    for (let p of pairs) {
      p.dispose();
    }
  } else {
    // Kill all but me
    for (let p of pairs) {
      if (firstDone !== p.socket) {
        p.dispose();
      }
    }
  }
  return firstDone;
}
