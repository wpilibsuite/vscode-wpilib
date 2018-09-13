'use strict';

import fetch from 'node-fetch';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import * as xml2js from 'xml2js';
import { promisifyReadDir } from './shared/generator';
import { promisifyExists, promisifyReadFile, promisifyWriteFile } from './utilities';

function getGradleRioRegex() {
  return /(id\s*?[\"|\']edu\.wpi\.first\.GradleRIO[\"|\'].*?version\s*?[\"|\'])(.+?)([\"|\'])/g;
}

export class WPILibUpdates {
  private externalApi: IExternalAPI;
  private disposables: vscode.Disposable[] = [];

  constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.checkForUpdates', async () => {
       await this.checkForUpdates();
    }, this));
  }

  public async checkForUpdates(): Promise<boolean> {
    const grVersion = await this.getGradleRIOVersion();
    if (grVersion === undefined) {
      console.log('gradlerio version not found');
      return false;
    }
    const newVersion = await this.checkForGradleRIOUpdate(grVersion);
    if (newVersion === undefined) {
      console.log('no update found');
      await vscode.window.showInformationMessage('No GradleRIO Update Found');
    } else {
      const result = await vscode.window.showInformationMessage
                           (`GradleRIO update (${newVersion}) found, would you like to install it?`, 'Yes', 'No');
      if (result !== undefined && result === 'Yes') {
        await this.setGradleRIOVersion(newVersion);
      }
    }

    return true;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async setGradleRIOVersion(version: string): Promise<void> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      console.log('no workspace');
      return;
    }
    try {
      const buildFile = path.join(wp.uri.fsPath, 'build.gradle');
      const gradleBuildFile = await promisifyReadFile(buildFile);

      const newgFile = gradleBuildFile.replace(getGradleRioRegex(), `$1${version}$3`);

      await promisifyWriteFile(buildFile, newgFile);
    } catch (err) {
      console.log(err);
      return;
    }
  }

  private async checkForGradleRIOUpdate(currentVersion: string): Promise<string | undefined> {
    const qResult = await vscode.window.showInformationMessage('Check offline or online?', 'Online', 'Offline');
    if (qResult === undefined) {
      return undefined;
    } else if (qResult === 'Online') {
      return this.checkForRemoteGradleRIOUpdate(currentVersion);
    } else {
      return this.checkForLocalGradleRIOUpdate(currentVersion);
    }
  }

  private async checkForRemoteGradleRIOUpdate(currentVersion: string): Promise<string | undefined> {
    const metaDataUrl = 'https://plugins.gradle.org/m2/gradle/plugin/edu/wpi/first/GradleRIO/maven-metadata.xml';
    try {
      const response = await fetch(metaDataUrl, {
        timeout: 5000,
      });
      if (response === undefined) {
        return undefined;
      }
      if (response.status >= 200 && response.status <= 300) {
        const text = await response.text();
        const release = await new Promise<string>((resolve, reject) => {
          xml2js.parseString(text, (err, result) => {
            if (err) {
              reject(err);
            } else {
              // tslint:disable-next-line:no-unsafe-any
              resolve(result.metadata.versioning[0].release[0]);
            }
          });
        });
        if (release === undefined) {
          return undefined;
        }
        if (release > currentVersion) {
          return release;
        }
        return undefined;
      } else {
        console.log('bad status: ', response.status);
        return undefined;
      }
    } catch (err) {
      console.log(err);
      return undefined;
    }
  }

  private async checkForLocalGradleRIOUpdate(currentVersion: string): Promise<string | undefined> {
    const frcHome = this.externalApi.getUtilitiesAPI().getWPILibHomeDir();
    const gradleRioPath = path.join(frcHome, 'maven', 'gradle', 'plugin', 'edu', 'wpi', 'first', 'GradleRIO');
    try {
      const files = await promisifyReadDir(gradleRioPath);
      const versions = [];
      for (const file of files) {
        const pth = path.join(gradleRioPath, file, `GradleRIO-${file}.pom`);
        const isGR = await promisifyExists(pth);
        if (isGR) {
          versions.push(file);
        }
      }
      let newVersion: string | undefined;
      for (const version of versions) {
        if (version > currentVersion) {
          newVersion = version;
        }
      }
      return newVersion;
    } catch (err) {
      console.log(err);
      return undefined;
    }
  }

  private async getGradleRIOVersion(): Promise<string | undefined> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      console.log('no workspace');
      return undefined;
    }

    try {
      const gradleBuildFile = await promisifyReadFile(path.join(wp.uri.fsPath, 'build.gradle'));

      const matchRes = getGradleRioRegex().exec(gradleBuildFile);

      if (matchRes === null) {
        console.log('matching error');
        return undefined;
      }

      if (matchRes.length !== 4) {
        console.log('matching length not correct');
        return undefined;
      }

      return matchRes[2];
    } catch (err) {
      console.log(err);
      return undefined;
    }
  }

}
