'use strict';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from "./shared/externalapi";

interface JsonLayout {

}

export class Commands {
  private readonly commandResourceName = 'commands.json';

  constructor(resourceRoot: string, core: ICommandAPI, preferences: IPreferencesAPI) {

  }

  public dispose() {

  }
}
