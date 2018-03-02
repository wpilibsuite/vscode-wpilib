'use strict';

export function getIsWindows(): boolean {
  let nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}
