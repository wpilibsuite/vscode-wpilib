'use strict';

import * as fs from 'fs';
import * as fetch from 'node-fetch';
import * as path from 'path';
import { mkdirpAsync } from './utilities';

const FILE_DOWNLOAD_TIMEOUT = 30000; // 30 seconds

export async function downloadTextFile(uri: string): Promise<string> {
  const response = await fetch.default(uri, {
    timeout: 5000,
  });

  if (response === undefined) {
    throw new Error('Failed to fetch URI: ' + uri);
  }

  if (!response.ok) {
    throw new fetch.FetchError(response.status.toString(10), response.statusText);
  }

  return response.text();
}

export async function downloadFileToStream(url: string, destPath: string): Promise<string> {
  const res = await fetch.default(url);
  if (!res.ok) {
    return Promise.reject({reason: 'Initial error downloading file', meta: {url, error: new Error(res.statusText)}});
  }

  await mkdirpAsync(path.dirname(destPath));

  const stream = fs.createWriteStream(destPath);
  let timer: NodeJS.Timeout;

  return new Promise<string>((resolve, reject) => {
    const errorHandler = (error: unknown) => {
      reject({reason: 'Unable to download file', meta: {url, error}});
    };

    res.body
      .on('error', errorHandler)
      .pipe(stream);

    stream
      .on('open', () => {
        timer = setTimeout(() => {
          stream.close();
          reject({reason: 'Timed out downloading file', meta: {url}});
        }, FILE_DOWNLOAD_TIMEOUT);
      })
      .on('error', errorHandler)
      .on('finish', () => {
        resolve(destPath);
      });
  }).then((localFolder) => {
    clearTimeout(timer);
    return localFolder;
  }, (err) => {
    clearTimeout(timer);
    return Promise.reject(err);
  });
}
