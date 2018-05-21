'use strict';

export interface Source {
  srcDirs: string[];
  includes: string[];
  excludes: string[];
}

export interface SourceSet {
  source: Source;
  exportedHeaders: Source;
  cpp: boolean;
  args: string[];
  macros: string[];
}

export interface Binary {
  componentName: string;
  sourceSets: SourceSet[];
  libHeaders: string[];
}

export interface ToolChain {
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
  binaries: Binary[];
}
