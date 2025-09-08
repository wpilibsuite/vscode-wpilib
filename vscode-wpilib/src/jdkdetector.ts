'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { logger } from './logger';

function parseMajorVersion(content: string): number {
  let regexp = /version "(.*)"/g;
  let match = regexp.exec(content);
  if (!match) {
    return 0;
  }
  let version = match[1];
  // Ignore '1.' prefix for legacy Java versions
  if (version.startsWith('1.')) {
    version = version.substring(2);
  }

  // look into the interesting bits now
  regexp = /\d+/g;
  match = regexp.exec(version);
  let javaVersion = 0;
  if (match) {
    javaVersion = parseInt(match[0], 10);
  }
  return javaVersion;
}

export function getJavaVersion(javaHome: string): Promise<number> {
  return new Promise((resolve) => {
    cp.execFile(path.join(javaHome, 'bin', 'java'), ['-version'], {}, (_, __, stderr) => {
      const javaVersion = parseMajorVersion(stderr);
      resolve(javaVersion);
    });
  });
}

async function checkJavaPath(path: string | undefined, source: string) {
  if (path) {
    try {
      const javaVersion = await getJavaVersion(path);
      if (javaVersion >= 21) {
        logger.log(`Found ${source} Version: ${javaVersion} at ${path}`);
        return true;
      } else {
        logger.info(`Bad Java version ${javaVersion} at ${path} from ${source}`);
      }
    } catch (err) {
      logger.log(`Error loading java from ${source}, skipping`, err);
    }
  }
  return false;
}

export async function findJdkPath(api: IExternalAPI): Promise<string | undefined> {
  // Check for java property, as thats easily user settable, and we want it to win
  const vscodeJavaHome = vscode.workspace.getConfiguration('java').get<string>('jdt.ls.java.home');
  if (await checkJavaPath(vscodeJavaHome, 'jdt.ls.java.home')) {
    return vscodeJavaHome;
  }
  // Check for deprecated java property, as that was used before 2024
  const vscodeOldJavaHome = vscode.workspace.getConfiguration('java').get<string>('home');
  if (await checkJavaPath(vscodeOldJavaHome, 'java.home')) {
    return vscodeOldJavaHome;
  }
  // Then check the FRC home directory for the FRC jdk
  const frcHome = api.getUtilitiesAPI().getWPILibHomeDir();
  const frcHomeJava = path.join(frcHome, 'jdk');
  if (await checkJavaPath(frcHomeJava, 'FRC Home JDK')) {
    return frcHomeJava;
  }
  // Check for java home
  const javaHome = process.env.JAVA_HOME;
  if (await checkJavaPath(javaHome, 'JAVA_HOME')) {
    return javaHome;
  }
  // Check for jdk home
  const jdkHome = process.env.JDK_HOME;
  if (await checkJavaPath(jdkHome, 'JDK_HOME')) {
    return jdkHome;
  }
  return undefined;
}
