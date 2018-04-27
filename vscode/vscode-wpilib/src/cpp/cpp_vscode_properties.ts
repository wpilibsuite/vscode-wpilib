'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CppGradleProperties } from './cpp_gradle_properties';
import { CppPreferences } from './cpp_preferences';

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
  private cppPreferences: CppPreferences;

  private readonly cppPropertiesFile: string;
  private readonly configFolder: string;

  public constructor(wp: vscode.WorkspaceFolder, gp: CppGradleProperties,  prefs: CppPreferences) {
    this.gradleProps = gp;
    this.cppPreferences = prefs;

    this.configFolder = path.join(wp.uri.fsPath, '.vscode');
    this.cppPropertiesFile = path.join(this.configFolder, 'c_cpp_properties.json');

    gp.onDidPropertiesChange(() => {
      this.updateCppConfigurationFile();
    });
  }

  private updateCppConfigurationFile() {
    const includes: string[] = this.cppPreferences.getAdditionalIncludeDirectories();
    const defines: string[] = this.cppPreferences.getAdditionalDefines();

    const compiler = this.gradleProps.getCompiler();
    const sysroot = this.gradleProps.getSysRoot();

    for (const s of systemHeaders) {
      includes.push(path.join(sysroot, s));
    }

    includes.push(...this.gradleProps.getLibraryHeaders());
    includes.push(...this.gradleProps.getLocalHeaders());

    defines.push(...defaultDefines);

    const configuration: ConfigurationJson = {
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

    const serialized = JSON.stringify(configuration, null, 4);
    try {
      fs.mkdirSync(this.configFolder);
    } catch (error) {
    }
    fs.writeFileSync(this.cppPropertiesFile, serialized);
  }

  public dispose() {

  }
}
