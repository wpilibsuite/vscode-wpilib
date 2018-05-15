'use strict';

import * as vscode from 'vscode';
import { CppGradleProperties } from './cppgradleproperties';
import { CppPreferences } from './cpppreferences';
import { CppVsCodeProperties } from './cppvscodeproperties';
import { IPreferencesAPI } from '../shared/externalapi';

export class PropertiesStore {
  private gradleCppProperties: CppGradleProperties[] = [];
  private vscodeCppProperties: CppVsCodeProperties[] = [];
  private cppPreferences: CppPreferences[] = [];
  private preferences: IPreferencesAPI;
  private disposables: vscode.Disposable[] = [];
  private gradleChannel: vscode.OutputChannel;

  constructor(preferences: IPreferencesAPI, gradleChannel: vscode.OutputChannel) {
    this.preferences = preferences;
    this.gradleChannel = gradleChannel;
  }


  public async construct(): Promise<void> {
    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces !== undefined) {
      // Create new header finders for every workspace
      for (const w of workspaces) {
        const p = this.preferences.getPreferences(w);
        if (p === undefined) {
          console.log('Preferences without workspace?');
          continue;
        }
        const cpr = new CppPreferences(w);
        const gp = new CppGradleProperties(w, this.gradleChannel, cpr, this.preferences);
        await gp.forceReparse();
        const cp = new CppVsCodeProperties(w, gp, cpr);
        this.cppPreferences.push(cpr);
        this.gradleCppProperties.push(gp);
        this.vscodeCppProperties.push(cp);
      }
    }

    // On a change in workspace folders, redo all header finders
    this.preferences.onDidPreferencesFolderChanged(async (changed) => {
      // Nuke and reset
      // TODO: Remove existing header finders from the extension context
      for (const p of this.gradleCppProperties) {
        p.dispose();
      }
      for (const p of this.cppPreferences) {
        p.dispose();
      }
      for (const p of this.vscodeCppProperties) {
        p.dispose();
      }

      for (const c of changed) {
        const cpr = new CppPreferences(c.workspace);
        const gp = new CppGradleProperties(c.workspace, this.gradleChannel, cpr, this.preferences);
        await gp.forceReparse();
        const cp = new CppVsCodeProperties(c.workspace, gp, cpr);
        this.cppPreferences.push(cpr);
        this.gradleCppProperties.push(gp);
        this.vscodeCppProperties.push(cp);
      }
      this.disposables.push(...this.gradleCppProperties);
      this.disposables.push(...this.vscodeCppProperties);
      this.disposables.push(...this.cppPreferences);
    });
    this.disposables.push(...this.gradleCppProperties);
    this.disposables.push(...this.vscodeCppProperties);
    this.disposables.push(...this.cppPreferences);
  }


  public getGradleProperties(): CppGradleProperties[] {
    return this.gradleCppProperties;
  }
  public getCppPreferences(): CppPreferences[] {
    return this.cppPreferences;
  }
  public getVscodeCppProperties(): CppVsCodeProperties[] {
    return this.vscodeCppProperties;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
