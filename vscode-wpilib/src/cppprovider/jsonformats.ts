'use strict';

export interface ISourceBinaryPair {
  source: ISource;
  componentName: string;
  cpp: boolean;
  args: string[];
  macros: string[];
}

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

export interface IBinaryMap {
  0: string;
  1: number;
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
  allLibFiles: string[];
  binaries: IBinary[];
  sourceBinaries: ISourceBinaryPair[];
  nameBinaryMap: { [name: string]: number };
}
