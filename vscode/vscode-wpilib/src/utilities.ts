'use strict';

export function getIsWindows(): boolean {
  const nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}
