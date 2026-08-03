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
  robotIP?: number | string;
}

const constantIps: string[] = [
  process.platform == 'win32' ? '172.26.0.1' : '172.27.0.1',
  '172.30.0.1',
  //, '127.0.0.1',
  // Uncomment the above line for testing on localhost.
];

const constantHosts: string[] = ['robot.local'];

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
  private dsDispose: () => void;

  constructor(rs: net.Socket, disposeDs: () => void, p: Promise<net.Socket>) {
    this.socket = rs;
    this.promise = p;
    this.dsDispose = disposeDs;
  }

  public dispose(): void {
    this.socket.emit('dispose');
    this.dsDispose();
  }
}

function getRobotIpFromDriverStationMessage(data: string): string | undefined {
  const trimmedData = data.trim();
  if (trimmedData.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(trimmedData) as IDriverStationData;
  const robotIP = parsed.robotIP;

  if (typeof robotIP === 'string') {
    const trimmed = robotIP.trim();
    if (
      trimmed.length === 0 ||
      trimmed === '0' ||
      trimmed === '0.0.0.0' ||
      net.isIP(trimmed) === 0
    ) {
      return undefined;
    }
    return trimmed;
  }

  if (typeof robotIP === 'number' && robotIP !== 0) {
    const ip = robotIP >>> 0;
    return `${(ip >> 24) & 0xff}.${(ip >> 16) & 0xff}.${(ip >> 8) & 0xff}.${ip & 0xff}`;
  }

  return undefined;
}

function connectSocketToIP(
  socket: net.Socket,
  port: number,
  ip: string,
  resolve: (value: net.Socket | PromiseLike<net.Socket>) => void,
  reject: () => void
): void {
  const failConnection = () => {
    logger.info('failed connection to ' + ip + ' at ' + port);
    socket.end();
    socket.destroy();
    socket.removeAllListeners();
    reject();
  };

  socket.on('error', failConnection);
  socket.on('timeout', failConnection);
  socket.on('close', failConnection);
  socket.on('dispose', () => {
    logger.info('disposed', ip);
    socket.end();
    socket.destroy();
    socket.removeAllListeners();
    reject();
  });
  socket.connect(port, ip, () => {
    socket.removeAllListeners();
    resolve(socket);
  });
}

function getSocketFromDSTcp(port: number, dsPort: number): ISocketPromisePair {
  const s = new net.Socket();
  const ds = new net.Socket();
  let dsBuffer = '';
  let foundRobotIp = false;

  const disposeDs = () => {
    ds.emit('dispose');
  };

  const retVal = new DSSocketPromisePair(
    s,
    disposeDs,
    new Promise((resolve, reject) => {
      const cleanupDs = () => {
        ds.end();
        ds.destroy();
        ds.removeAllListeners();
      };
      const tryConnectToRobot = (rawMessage: string) => {
        let ipAddr: string | undefined;
        try {
          ipAddr = getRobotIpFromDriverStationMessage(rawMessage);
        } catch (e) {
          logger.info('failed parsing driver station message', e);
          return false;
        }

        if (!ipAddr) {
          return false;
        }

        foundRobotIp = true;
        cleanupDs();
        connectSocketToIP(s, port, ipAddr, resolve, reject);
        return true;
      };

      ds.on('data', (data) => {
        if (foundRobotIp) {
          return;
        }

        dsBuffer += data.toString();
        const messages = dsBuffer.split('\n');
        dsBuffer = messages.pop() ?? '';

        for (const message of messages) {
          if (message.trim().length === 0) {
            continue;
          }
          if (tryConnectToRobot(message)) {
            return;
          }
        }

        const pendingMessage = dsBuffer.trim();
        if (pendingMessage.endsWith('}')) {
          if (!tryConnectToRobot(dsBuffer)) {
            dsBuffer = '';
          }
        }
      });
      ds.on('error', () => {
        cleanupDs();
        reject();
      });
      ds.on('dispose', () => {
        logger.info('disposed ds');
        cleanupDs();
        reject();
      });
      ds.connect(dsPort, '127.0.0.1');
    })
  );
  return retVal;
}

function getSocketFromDSWebSocket(port: number): ISocketPromisePair {
  const s = new net.Socket();
  let ws: WebSocket | undefined;
  let foundRobotIp = false;
  let rejectPromise: (() => void) | undefined;

  const disposeDs = () => {
    if (ws && ws.readyState !== WebSocket.CLOSED) {
      ws.close();
    }
    if (rejectPromise) {
      rejectPromise();
    }
  };

  const retVal = new DSSocketPromisePair(
    s,
    disposeDs,
    new Promise((resolve, reject) => {
      rejectPromise = reject;
      if (typeof WebSocket === 'undefined') {
        reject();
        return;
      }

      ws = new WebSocket('ws://localhost:6768/ipws');

      ws.addEventListener('message', (event) => {
        if (foundRobotIp) {
          return;
        }

        let ipAddr: string | undefined;
        try {
          ipAddr = getRobotIpFromDriverStationMessage(event.data.toString());
        } catch (e) {
          logger.info('failed parsing driver station websocket message', e);
          return;
        }

        if (!ipAddr) {
          return;
        }

        foundRobotIp = true;
        ws?.close();
        connectSocketToIP(s, port, ipAddr, resolve, reject);
      });

      ws.addEventListener('error', () => {
        if (!foundRobotIp) {
          reject();
        }
      });

      ws.addEventListener('close', () => {
        if (!foundRobotIp) {
          reject();
        }
      });
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
      connectSocketToIP(s, port, ip, resolve, reject);
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
  for (const c of constantHosts) {
    pairs.push(getSocketFromIP(port, c));
  }
  pairs.push(getSocketFromIP(port, `10.${Math.trunc(teamNumber / 100)}.${teamNumber % 100}.2`));
  pairs.push(getSocketFromDSWebSocket(port));
  pairs.push(getSocketFromDSTcp(port, 6770));
  const connectors: Promise<net.Socket | undefined>[] = [];
  for (const p of pairs) {
    connectors.push(p.promise);
  }
  const timer = timerPromise(timeout);
  connectors.push(timer.promise);
  const firstDone: net.Socket | undefined = await properRace(connectors);
  if (!firstDone) {
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
