'use strict';

import * as fetch from 'node-fetch';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import * as xml2js from 'xml2js';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { PersistentFolderState } from './persistentState';
import { existsAsync, readdirAsync, readFileAsync, writeFileAsync } from './utilities';
import { isNewerVersion } from './versions';

function getGradleRioRegex() {
  return /(id\s*?["|']edu\.wpi\.first\.GradleRIO["|'].*?version\s*?["|'])(.+?)(["|'])/g;
}

interface IOnlineTuple {
  online: boolean;
  newVersion: string | undefined;
}

export class WPILibUpdates {
  public static getUpdatePersistentState(workspace: vscode.WorkspaceFolder): PersistentFolderState<boolean> {
    return new PersistentFolderState('wpilib.projectUpdate', false, workspace.uri.fsPath);
  }

  private externalApi: IExternalAPI;
  private disposables: vscode.Disposable[] = [];

  constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.checkForUpdates', async () => {
      if (!await this.checkForUpdates()) {
        logger.log('no update installed');
      }
    }, this));
  }

  public async checkForInitialUpdate(wp: vscode.WorkspaceFolder): Promise<boolean> {
    const grVersion = await this.getGradleRIOVersion(wp);
    if (grVersion === undefined) {
      return false;
    }
    const newVersion = await this.checkForLocalGradleRIOUpdate(grVersion);
    const persistentState = WPILibUpdates.getUpdatePersistentState(wp);
    if (newVersion !== undefined && persistentState.Value === false) {
      const result = await vscode.window.showInformationMessage(i18n('message',
          `This project is currently using WPILib version ({1}). Would you like to update the project ` +
          `to WPILib version {0}?`, newVersion, grVersion), {
            modal: true,
          }, i18n('ui', 'Yes'), i18n('ui', 'No'), i18n('ui', 'No, Don\'t ask again'));
      if (result !== undefined && result === i18n('ui', 'Yes')) {
        await this.setGradleRIOVersion(newVersion, wp);
        return true;
      } else if (result !== undefined && result === i18n('ui', 'No, Don\'t ask again')) {
        persistentState.Value = true;
      }
    }
    return false;
  }

  public async checkForUpdates(): Promise<boolean> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      logger.warn('no workspace');
      return false;
    }
    const grVersion = await this.getGradleRIOVersion(wp);
    if (grVersion === undefined) {
      return false;
    }
    const newVersion = await this.checkForGradleRIOUpdate(grVersion);
    if (newVersion === undefined || newVersion.newVersion === undefined) {
      logger.log('no update found');
      vscode.window.showInformationMessage(i18n('message', 'No WPILib Update Found'));
      return false;
    } else {
      const result = await vscode.window.showInformationMessage(i18n('message', 
        `This project is currently using WPILib version ({1}). Would you like to update the project ` +
        `to WPILib version {0}?`, newVersion.newVersion, grVersion), {
            modal: true,
          }, i18n('ui', 'Yes'), i18n('ui', 'No'));
      if (result !== undefined && result === i18n('ui', 'Yes')) {
        await this.setGradleRIOVersion(newVersion.newVersion, wp);
        if (newVersion.online) {
          const buildRes = await vscode.window.showInformationMessage(i18n('message', 'It is recommended to run a "Build" and update tools after a ' +
            'WPILib update to ensure dependencies are installed correctly. Would you like to do this now?'), {
              modal: true,
            }, i18n('ui', 'Yes'), i18n('ui', 'Yes (Build Only)'), i18n('ui', 'No'));
          if (buildRes !== undefined) {
            if (buildRes === i18n('ui', 'Yes')) {
              await this.externalApi.getBuildTestAPI().buildCode(wp, undefined, 'InstallAllTools');
            } else if (buildRes === i18n('ui', 'Yes (Build Only)')) {
              await this.externalApi.getBuildTestAPI().buildCode(wp, undefined);
            }
          }
        } else {
          const buildRes = await vscode.window.showInformationMessage(i18n('message',
            'It is recommended to run a "Build" after a WPILib update to ensure dependencies are installed correctly. ' +
            'Would you like to do this now?'), {
              modal: true,
            }, {title: i18n('ui', 'Yes')}, {title: i18n('ui', 'No'), isCloseAffordance: true});
          if (buildRes?.title !== i18n('ui', 'Yes')) {
            await this.externalApi.getBuildTestAPI().buildCode(wp, undefined);
          }
        }
      }
    }

    return true;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async getGradleRIOVersion(wp: vscode.WorkspaceFolder): Promise<string | undefined> {

    try {
      const gradleBuildFile = await readFileAsync(path.join(wp.uri.fsPath, 'build.gradle'), 'utf8');

      const matchRes = getGradleRioRegex().exec(gradleBuildFile);

      if (matchRes === null) {
        logger.warn('matching error');
        return undefined;
      }

      if (matchRes.length !== 4) {
        logger.warn('matching length not correct');
        return undefined;
      }

      logger.log('Local GradleRIO Version ' + matchRes[2]);

      return matchRes[2];
    } catch (err) {
      logger.warn('local gradlerio version exception', err);
      return undefined;
    }
  }

  public async setGradleRIOVersion(version: string, wp: vscode.WorkspaceFolder): Promise<void> {
    try {
      const buildFile = path.join(wp.uri.fsPath, 'build.gradle');
      const gradleBuildFile = await readFileAsync(buildFile, 'utf8');

      const newgFile = gradleBuildFile.replace(getGradleRioRegex(), `$1${version}$3`);

      await writeFileAsync(buildFile, newgFile);
    } catch (err) {
      logger.error('error setting wpilib (gradlerio) version', err);
      return;
    }
  }

  private async checkForGradleRIOUpdate(currentVersion: string): Promise<IOnlineTuple | undefined> {
    const qResult = await vscode.window.showInformationMessage(
      i18n('message', 'Check offline or online?'),
      { modal: true },
      i18n('ui', 'Online'), i18n('ui', 'Offline'));
    if (qResult === undefined) {
      return undefined;
    } else if (qResult === i18n('ui', 'Online')) {
      return {
        newVersion: await this.checkForRemoteGradleRIOUpdate(currentVersion),
        online: true,
      };
    } else {
      return {
        newVersion: await this.checkForLocalGradleRIOUpdate(currentVersion),
        online: false,
      };
    }
  }

  private async checkForRemoteGradleRIOUpdate(currentVersion: string): Promise<string | undefined> {
    const metaDataUrl = 'https://plugins.gradle.org/m2/edu/wpi/first/GradleRIO/maven-metadata.xml';
    try {
      const response = await fetch.default(metaDataUrl, {
        timeout: 5000,
      });
      if (response === undefined) {
        logger.warn('failed to fetch URL: ' + metaDataUrl);
        return undefined;
      }
      if (response.status >= 200 && response.status <= 300) {
        const text = await response.text();
        const versions = await new Promise<string[]>((resolve, reject) => {
          xml2js.parseString(text, (err, result) => {
            if (err) {
              reject(err);
            } else {
              
              resolve(result.metadata.versioning[0].versions[0].version);
            }
          });
        });
        if (versions === undefined) {
          logger.warn('parse failure');
          return undefined;
        }
        if (versions.length === 0) {
          return undefined;
        }
        let newestVersion = '0';
        const frcYear = this.externalApi.getUtilitiesAPI().getFrcYear();
        for (const v of versions) {
          if (v.startsWith(frcYear) && isNewerVersion(v, newestVersion)) {
            newestVersion = v;
          }
        }
        if (isNewerVersion(newestVersion, currentVersion)) {
          return newestVersion;
        }
        return undefined;
      } else {
        logger.warn('bad status: ' + response.status.toString());
        return undefined;
      }
    } catch (err) {
      logger.warn('remote gradlerio exception', err);
      return undefined;
    }
  }

  private async checkForLocalGradleRIOUpdate(currentVersion: string): Promise<string | undefined> {
    const frcHome = this.externalApi.getUtilitiesAPI().getWPILibHomeDir();
    const gradleRioPath = path.join(frcHome, 'maven', 'edu', 'wpi', 'first', 'GradleRIO');
    try {
      const files = await readdirAsync(gradleRioPath);
      const versions = [];
      for (const file of files) {
        const pth = path.join(gradleRioPath, file, `GradleRIO-${file}.pom`);
        const isGR = await existsAsync(pth);
        if (isGR) {
          versions.push(file);
        }
      }
      if (versions.length === 0) {
        return undefined;
      }
      let newestVersion = versions[0];
      for (const v of versions) {
        if (isNewerVersion(v, newestVersion)) {
          newestVersion = v;
        }
      }
      if (isNewerVersion(newestVersion, currentVersion)) {
        return newestVersion;
      }
      return undefined;
    } catch (err) {
      logger.warn('local gradlerio exception', err);
      return undefined;
    }
  }
}
