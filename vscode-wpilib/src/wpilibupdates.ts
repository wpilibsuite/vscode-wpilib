'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { promisifyReadFile, promisifyWriteFile } from './utilities';

const gradleRioVersionRegex = /(id\s*?[\"|\']edu\.wpi\.first\.GradleRIO[\"|\'].*?version\s*?[\"|\'])(.+?)([\"|\'])/g;

export class WPILibUpdates {
  private externalApi: IExternalAPI;
  private disposables: vscode.Disposable[] = [];

  constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.checkForUpdates', async () => {
      vscode.window.showInformationMessage('Not supported yet');
      return;
      // await this.checkForUpdates();
    }, this));
  }

  public async checkForUpdates(): Promise<boolean> {
    const grVersion = await this.getGradleRIOVersion();
    if (grVersion === undefined) {
      console.log('gradlerio version not found');
      return false;
    }

    return true;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async setGradleRIOVersion(version: string): Promise<void> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      console.log('no workspace');
      return;
    }
    try {
      const buildFile = path.join(wp.uri.fsPath, 'build.gradle');
      const gradleBuildFile = await promisifyReadFile(buildFile);

      const newgFile = gradleBuildFile.replace(gradleRioVersionRegex, `$1${version}$3`);

      await promisifyWriteFile(buildFile, newgFile);
    } catch (err) {
      console.log(err);
      return;
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

      const matchRes = gradleRioVersionRegex.exec(gradleBuildFile);

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
