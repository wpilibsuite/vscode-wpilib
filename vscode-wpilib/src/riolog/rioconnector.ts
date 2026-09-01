'use strict';

import * as net from 'net';
import { logger } from '../logger';

interface IDriverStationData {
  robotIp?: string;
}

const constantIps: string[] = [
  process.platform === 'win32' ? '172.26.0.1' : '172.27.0.1',
  '172.30.0.1',
  'robot.local',
  // '127.0.0.1',
  // Uncomment the above line for testing on localhost.
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
  const robotIp = parsed.robotIp;

  if (typeof robotIp === 'string') {
    const trimmed = robotIp.trim();
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

  return new DSSocketPromisePair(
    s,
    disposeDs,
    new Promise((resolve, reject) => {
      rejectPromise = reject;

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
  pairs.push(getSocketFromIP(port, `10.${Math.trunc(teamNumber / 100)}.${teamNumber % 100}.2`));
  pairs.push(getSocketFromDSWebSocket(port));
  const connectors: Promise<net.Socket | undefined>[] = [];
  for (const p of pairs) {
    connectors.push(p.promise);
  }
  const timer = timerPromise(timeout);
  connectors.push(timer.promise);
  const firstDone: net.Socket | undefined = await Promise.any(connectors);
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
