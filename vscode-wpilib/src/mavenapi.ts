'use strict';

import * as xml2js from 'xml2js';
import { downloadTextFile } from './fetchhelpers';
import { isNewerVersion } from './versions';

export interface IVersions {
  version: string[];
}

export interface IVersioning {
  versions: IVersions[];
}

export interface IMetaData {
 versioning: IVersioning[];
 artifactId: string;
}

export interface IMavenMetaData {
  metadata: IMetaData;
}

export function getMavenMetadataContents(repoRoot: string): Promise<string> {
  const xmlFile = repoRoot[repoRoot.length - 1] === '/' ? repoRoot + 'maven-metadata.xml' : repoRoot + '/maven-metadata.xml';
  return downloadTextFile(xmlFile);
}

export function getMavenMetadata(xmlFile: string): Promise<IMavenMetaData> {
  return new Promise<IMavenMetaData>((resolve, reject) => {
    xml2js.parseString(xmlFile, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result as IMavenMetaData);
    });
  });
}

export function getMavenVersions(metadata: IMavenMetaData): string[] {
  return metadata.metadata.versioning[0].versions[0].version;
}

export function getNewestMavenVersion(versions: string[]): string | undefined {
  if (versions.length === 0) {
    return undefined;
  }
  let newestVersion = versions[0];
  for (const v of versions) {
    if (isNewerVersion(v, newestVersion)) {
      newestVersion = v;
    }
  }
  return newestVersion;
}

export function constructDownloadUrl(metadata: IMavenMetaData, repoRoot: string, version: string, ext: string) {
  const rootDir = repoRoot[repoRoot.length - 1] === '/' ? repoRoot : repoRoot + '/';
  const versionDir = rootDir + version + '/';
  const fileDir = versionDir + metadata.metadata.artifactId + '-' + version + ext;
  return fileDir;
}
