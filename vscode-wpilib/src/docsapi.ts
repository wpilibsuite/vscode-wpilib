'use strict';

import * as extractzip from 'extract-zip';
import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { downloadFileToStream } from './fetchhelpers';
import {constructDownloadUrl, getMavenMetadata, getMavenMetadataContents, getMavenVersions, getNewestMavenVersion} from './mavenapi';
import { deleteFileAsync, existsAsync, mkdirpAsync } from './utilities';

export async function downloadDocs(repoRoot: string, ext: string,  rootFolder: string, innerFolder: string): Promise<string | undefined> {
  let disposable: vscode.Disposable | undefined;
  try {
    const answer = await vscode.window.showInformationMessage('Documentation not installed locally. Would you like to download it?', {
      modal: true,
    }, 'Yes', 'No');

    if (answer === 'Yes') {

      disposable = vscode.window.setStatusBarMessage('Downloading Maven MetaData');

      const metaDataFile = await getMavenMetadataContents(repoRoot);

      const metaData = await getMavenMetadata(metaDataFile);

      const versions = getMavenVersions(metaData);

      const newstVersion = getNewestMavenVersion(versions);

      if (newstVersion === undefined) {
        throw new Error('No version found');
      }

      const downloadUrl = constructDownloadUrl(metaData, repoRoot, newstVersion, ext);
      const tmpFolder = path.join(rootFolder, 'tmp');

      await mkdirpAsync(tmpFolder);

      const outputFile = path.join(tmpFolder, 'download' + ext);

      if (await existsAsync(outputFile)) {
        await deleteFileAsync(outputFile);
      }

      disposable.dispose();
      disposable = vscode.window.setStatusBarMessage('Downloading API Docs');

      await  downloadFileToStream(downloadUrl, outputFile);

      const outputDir = path.join(rootFolder, innerFolder);

      await mkdirpAsync(outputDir);

      const extractAsync = util.promisify(extractzip);

      disposable.dispose();
      disposable = vscode.window.setStatusBarMessage('Extracting API Docs');

      await extractAsync(outputFile, {
        dir: outputDir,
      });
      return outputDir;
    }
    return undefined;
  } catch (err) {
    if (disposable !== undefined) {
      disposable.dispose();
    }
    vscode.window.setStatusBarMessage('Error Downloading Docs', 5000);
    throw err;
  } finally {
    if (disposable !== undefined) {
      disposable.dispose();
    }
  }
}
