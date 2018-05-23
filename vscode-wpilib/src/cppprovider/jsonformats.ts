'use strict';

export interface ISource {
  srcDirs: string[];
  includes: string[];
  excludes: string[];
}

export interface ISourceSet {
  source: ISource;
  exportedHeaders: ISource;
  cpp: boolean;
  args: string[];
  macros: string[];
}

export interface IBinary {
  componentName: string;
  sourceSets: ISourceSet[];
  libHeaders: string[];
}

export interface IToolChain {
  name: string;
  architecture: string;
  operatingSystem: string;
  flavor: string;
  buildType: string;
  cppPath: string;
  cPath: string;
  msvc: boolean;
  systemCppMacros: string[];
  systemCppArgs: string[];
  systemCMacros: string[];
  systemCArgs: string[];
  binaries: IBinary[];
}
