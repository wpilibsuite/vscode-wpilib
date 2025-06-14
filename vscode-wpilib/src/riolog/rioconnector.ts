'use strict';

import * as net from 'net';
import { logger } from '../logger';

async function properRace<T>(promises: Promise<T>[]): Promise<T> {
  if (promises.length < 1) {
    return Promise.reject("Can't start a race without promises!");
  }

  // There is no way to know which promise is rejected.
  // So we map it to a new promise to return the index when it fails
  const indexPromises = promises.map((p, index) =>
    p.catch(() => {
      throw index;
    })
  );

  try {
    return await Promise.race(indexPromises);
  } catch (index) {
    // The promise has rejected, remove it from the list of promises and just continue the race.
    logger.info('reject promise');
    const p = promises.splice(index as number, 1)[0];
    p.catch((e) => logger.info('A promise has been rejected, but awaiting others', e));
    return properRace(promises);
  }
}

interface IDriverStationData {
  robotIP: number;
}

const constantIps: string[] = [
  '172.22.11.2',
  //, '127.0.0.1',
  // Uncomment the above line for testing on localhost.
];

const teamIps: string[] = [
  'roboRIO-TEAM-FRC.local',
  'roboRIO-TEAM-FRC.lan',
  'roboRIO-TEAM-FRC.frc-field.local',
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
  let timer: NodeJS.Timeout | undefined;
  return {
    promise: new Promise((resolve, _) => {
      timer = setTimeout(() => {
        resolve(undefined);
      }, ms);
    }),
    cancel() {
      if (timer === undefined) {
        return;
      }
      logger.info('cancelled timer');
      clearTimeout(timer);
    },
  };
}

class DSSocketPromisePair implements ISocketPromisePair {
  public socket: net.Socket;
  public promise: Promise<net.Socket>;
  private dsSocket: net.Socket;

  constructor(rs: net.Socket, ds: net.Socket, p: Promise<net.Socket>) {
    this.socket = rs;
    this.promise = p;
    this.dsSocket = ds;
  }

  public dispose(): void {
    this.socket.emit('dispose');
    this.dsSocket.emit('dispose');
  }
}

function getSocketFromDS(port: number): ISocketPromisePair {
  const s = new net.Socket();
  const ds = new net.Socket();
  const retVal = new DSSocketPromisePair(
    s,
    ds,
    new Promise((resolve, reject) => {
      // First connect to ds, and wait for data
      ds.on('data', (data) => {
        const parsed: IDriverStationData = JSON.parse(data.toString()) as IDriverStationData;
        if (parsed.robotIP === 0) {
          ds.end();
          ds.destroy();
          ds.removeAllListeners();
          reject();
          return;
        }
        let ipAddr = '';
        const ip = parsed.robotIP;
        ipAddr += ((ip >> 24) & 0xff) + '.';
        ipAddr += ((ip >> 16) & 0xff) + '.';
        ipAddr += ((ip >> 8) & 0xff) + '.';
        ipAddr += ip & 0xff;
        s.on('error', (_) => {
          logger.info('failed connection to ' + ip + ' at ' + port);
          s.end();
          s.destroy();
          s.removeAllListeners();
          reject();
        });
        s.on('timeout', () => {
          logger.info('failed connection to ' + ip + ' at ' + port);
          s.end();
          s.destroy();
          s.removeAllListeners();
          reject();
        });
        s.on('close', () => {
          logger.info('failed connection to ' + ip + ' at ' + port);
          s.end();
          s.destroy();
          s.removeAllListeners();
          reject();
        });
        s.on('dispose', () => {
          logger.info('disposed ds connected');
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
        logger.info('disposed ds');
        reject();
        ds.end();
        ds.destroy();
        ds.removeAllListeners();
      });
      ds.connect(1742, '127.0.0.1');
    })
  );
  return retVal;
}

class RawSocketPromisePair implements ISocketPromisePair {
  public socket: net.Socket;
  public promise: Promise<net.Socket>;

  constructor(rs: net.Socket, p: Promise<net.Socket>) {
    this.socket = rs;
    this.promise = p;
  }

  public dispose(): void {
    this.socket.emit('dispose');
  }
}

function getSocketFromIP(port: number, ip: string): ISocketPromisePair {
  const s = new net.Socket();
  return new RawSocketPromisePair(
    s,
    new Promise((resolve, reject) => {
      s.on('error', (_) => {
        logger.info('failed connection to ' + ip + ' at ' + port);
        s.end();
        s.destroy();
        s.removeAllListeners();
        reject();
      });
      s.on('timeout', () => {
        logger.info('failed connection to ' + ip + ' at ' + port);
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
        logger.info('disposed', ip);
        reject();
        s.end();
        s.destroy();
        s.removeAllListeners();
      });
      s.connect(port, ip, () => {
        s.removeAllListeners();
        resolve(s);
      });
    })
  );
}

export async function connectToRobot(
  port: number,
  teamNumber: number,
  timeout: number
): Promise<net.Socket | undefined> {
  const pairs: ISocketPromisePair[] = [];
  teamNumber = Math.trunc(teamNumber);

  for (const c of constantIps) {
    pairs.push(getSocketFromIP(port, c));
  }
  for (const c of teamIps) {
    pairs.push(getSocketFromIP(port, c.replace('TEAM', teamNumber.toString())));
  }
  pairs.push(getSocketFromIP(port, `10.${Math.trunc(teamNumber / 100)}.${teamNumber % 100}.2`));
  pairs.push(getSocketFromDS(port));
  const connectors: Promise<net.Socket | undefined>[] = [];
  for (const p of pairs) {
    connectors.push(p.promise);
  }
  const timer = timerPromise(timeout);
  connectors.push(timer.promise);
  const firstDone: net.Socket | undefined = await properRace(connectors);
  if (firstDone === undefined) {
    // Kill all
    for (const p of pairs) {
      p.dispose();
      try {
        await p.promise;
        // eslint-disable-next-line no-empty
      } catch {}
    }
  } else {
    // Kill all but me
    timer.cancel();
    logger.info('Using ' + firstDone.remoteAddress + ', disposing others');
    for (const p of pairs) {
      if (firstDone !== p.socket) {
        p.dispose();
        try {
          await p.promise;
          // eslint-disable-next-line no-empty
        } catch {}
      }
    }
  }
  return firstDone;
}
