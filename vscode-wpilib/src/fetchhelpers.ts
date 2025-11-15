'use strict';

import * as fs from 'fs';
import { mkdir } from 'fs/promises';
import * as path from 'path';

const FILE_DOWNLOAD_TIMEOUT = 30000; // 30 seconds

export async function downloadTextFile(uri: string): Promise<string> {
  const response = await fetch(uri, {
    signal: AbortSignal.timeout(5000),
  });

  if (response === undefined) {
    throw new Error('Failed to fetch URI: ' + uri);
  }

  if (!response.ok) {
    throw new Error(`${response.status.toString(10)}: ${response.statusText}`);
  }

  return response.text();
}

export async function downloadFileToStream(url: string, destPath: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FILE_DOWNLOAD_TIMEOUT),
  });
  if (!res.ok) {
    // @ts-expect-error Error constructor should work
    throw new Error('Initial error downloading file ' + url, {
      cause: new Error(res.statusText),
    });
  }

  await mkdir(path.dirname(destPath), { recursive: true });

  const stream = fs.createWriteStream(destPath);
  stream.on('error', (error: unknown) => {
    // @ts-expect-error Error constructor should work
    throw new Error('Unable to download file ' + url, { cause: error });
  });
  if (res.body) {
    await res.body.pipeTo(fs.WriteStream.toWeb(stream));
  } else {
    throw new Error('Unable to download file ' + url);
  }
  return destPath;
}
