'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IPreferences } from './shared/externalapi';
import { CppGradleProperties } from './cpp_gradle_properties';

interface Browse {
  path?: string[];
  limitSymbolsToIncludedHeaders?: boolean;
  databaseFilename?: string;
}

interface Configuration {
  name: string;
  compilerPath?: string;
  cStandard?: string;
  cppStandard?: string;
  includePath?: string[];
  macFrameworkPath?: string[];
  defines?: string[];
  intelliSenseMode?: string;
  compileCommands?: string;
  forcedInclude?: string[];
  browse?: Browse;
}

interface ConfigurationJson {
  configurations: Configuration[];
  version: number;
}

const systemHeaders: string[] = [
  '\\arm-frc-linux-gnueabi\\include\\c++\\5.5.0',
  '\\arm-frc-linux-gnueabi\\include\\c++\\5.5.0\\arm-frc-linux-gnueabi',
  '\\arm-frc-linux-gnueabi\\include\\c++\\5.5.0\\backward',
  '\\lib\\gcc\\arm-frc-linux-gnueabi\\5.5.0\\include',
  '\\lib\\gcc\\arm-frc-linux-gnueabi\\5.5.0\\include-fixed',
  '\\arm-frc-linux-gnueabi\\include',
  '\\usr\\include'
];

const defaultDefines: string[] = [
  '__linux__',
  '__SIZE_TYPE__=unsigned int'
];

const cppStandard = 'c++14';
const cStandard = 'c11';
const intelliSenseMode = 'clang-x64';
const platformName = 'RoboRio';

const version = 3;

export class CppVsCodeProperties {
  private gradleProps: CppGradleProperties;
  private preferences: IPreferences;

  private readonly cppPropertiesFile: string;
  private readonly configFolder: string;

  public constructor(wp: vscode.WorkspaceFolder, gp: CppGradleProperties,  prefs: IPreferences) {
    this.gradleProps = gp;
    this.preferences = prefs;

    this.configFolder = path.join(wp.uri.fsPath, '.vscode');
    this.cppPropertiesFile = path.join(this.configFolder, 'c_cpp_properties.json');

    try {
      fs.mkdirSync(this.configFolder);
    } catch (error) {
    }

    gp.onDidPropertiesChange(() => {
      this.updateCppConfigurationFile();
    });
  }

  private updateCppConfigurationFile() {
    let langSpec = this.preferences.getLanguageSpecific('cpp');
    let includes: string[] = [];
    let defines: string[] = [];

    if (langSpec !== undefined) {
      if ('additionalIncludeDirectories' in langSpec.languageData) {
        try {
          includes.push(...langSpec.languageData.additionalIncludeDirectories);
        } catch (error) {
          console.log(error);
        }
      }
      if ('additionalDefines' in langSpec.languageData) {
        try {
          defines.push(...langSpec.languageData.additionalDefines);
        } catch (error) {
          console.log(error);
        }
      }
    }

    let compiler = this.gradleProps.getCompiler();
    let sysroot = this.gradleProps.getSysRoot();

    for (let s of systemHeaders) {
      includes.push(path.join(sysroot, s));
    }

    includes.push(...this.gradleProps.getLibraryHeaders());
    includes.push(...this.gradleProps.getLocalHeaders());

    defines.push(...defaultDefines);

    let configuration: ConfigurationJson = {
      version: version,
      configurations: [
        {
          name: platformName,
          intelliSenseMode: intelliSenseMode,
          cStandard: cStandard,
          cppStandard: cppStandard,
          defines: defines,
          includePath: includes,
          compilerPath: path.normalize(compiler)
        }
      ]
    };

    let serialized = JSON.stringify(configuration, null, 4);
    fs.writeFileSync(this.cppPropertiesFile, serialized);
  }

  dispose() {

  }
}
