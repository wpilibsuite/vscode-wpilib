'use strict';

import * as extract from 'extract-zip';
import { mkdir, unlink } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { downloadFileToStream } from './fetchhelpers';
import { localize as i18n } from './locale';
import {
  constructDownloadUrl,
  getMavenMetadata,
  getMavenMetadataContents,
  getMavenVersions,
  getNewestMavenVersion,
} from './mavenapi';

export async function downloadDocs(
  repoRoot: string,
  ext: string,
  rootFolder: string,
  innerFolder: string
): Promise<string | undefined> {
  let disposable: vscode.Disposable | undefined;
  try {
    const answer = await vscode.window.showInformationMessage(
      i18n('message', 'Documentation not installed locally. Would you like to download it?'),
      { modal: true },
      { title: i18n('ui', 'Yes') },
      { title: i18n('ui', 'No'), isCloseAffordance: true }
    );

    if (answer?.title === i18n('ui', 'Yes')) {
      disposable = vscode.window.setStatusBarMessage(i18n('message', 'Downloading Maven MetaData'));

      const metaDataFile = await getMavenMetadataContents(repoRoot);

      const metaData = await getMavenMetadata(metaDataFile);

      const versions = getMavenVersions(metaData);

      const newestVersion = getNewestMavenVersion(versions);

      if (newestVersion === undefined) {
        throw new Error('No version found');
      }

      const downloadUrl = constructDownloadUrl(metaData, repoRoot, newestVersion, ext);
      const tmpFolder = path.join(rootFolder, 'tmp');

      await mkdir(tmpFolder, { recursive: true });

      const outputFile = path.join(tmpFolder, 'download' + ext);

      try {
        await unlink(outputFile);
      } catch {
        // Ignore
      }

      disposable.dispose();
      disposable = vscode.window.setStatusBarMessage(i18n('message', 'Downloading API Docs'));

      await downloadFileToStream(downloadUrl, outputFile);

      const outputDir = path.join(rootFolder, innerFolder);

      await mkdir(outputDir, { recursive: true });

      disposable.dispose();
      disposable = vscode.window.setStatusBarMessage(i18n('message', 'Extracting API Docs'));

      await extract(outputFile, {
        dir: outputDir,
      });
      return outputDir;
    }
    return undefined;
  } catch (err) {
    if (disposable !== undefined) {
      disposable.dispose();
    }
    vscode.window.setStatusBarMessage(i18n('message', 'Error Downloading Docs'), 5000);
    throw err;
  } finally {
    if (disposable !== undefined) {
      disposable.dispose();
    }
  }
}
