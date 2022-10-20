'use strict';

export interface ISourceBinaryPair {
  source: ISource;
  componentName: string;
  cpp: boolean;
  args: string[];
  macros: string[];
  sharedLibrary?: boolean;
  executable?: boolean;
  langVersion?: 'c89' | 'c99' | 'c11' | 'c17' | 'c++98' | 'c++03' | 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
  langVersionSet?: boolean;
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
  sharedLibrary?: boolean;
  executable?: boolean;
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
  gcc?: boolean;
  systemCppMacros: string[];
  systemCppArgs: string[];
  systemCMacros: string[];
  systemCArgs: string[];
  allLibFiles: string[];
  binaries: IBinary[];
  sourceBinaries: ISourceBinaryPair[];
  nameBinaryMap: { [name: string]: number };
  cppLangVersion?: 'c89' | 'c99' | 'c11' | 'c17' | 'c++98' | 'c++03' | 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
  cLangVersion?: 'c89' | 'c99' | 'c11' | 'c17' | 'c++98' | 'c++03' | 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
}
