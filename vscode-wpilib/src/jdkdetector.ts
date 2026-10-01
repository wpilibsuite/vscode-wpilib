'use strict';

import * as cp from 'child_process';
import { readFile } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { logger } from './logger';

function parseVersion(content: string): string {
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
  return version;
}

export async function getJavaVersion(javaHome: string): Promise<{ major: number; full: string }> {
  try {
    const releaseFile = await readFile(path.join(javaHome, 'release'), 'utf-8');
    // JAVA_VERSION should always exist in this format, so asserting it's non-null should be fine
    const fullVersion = releaseFile.match(/JAVA_VERSION="(.*)"/)![1];
    return { major: parseInt(fullVersion.split('.')[0], 10), full: fullVersion };
  } catch {
    // But if it doesn't exist, fall back
    return new Promise((resolve) => {
      cp.execFile(path.join(javaHome, 'bin', 'java'), ['-version'], {}, (_, __, stderr) => {
        const fullVersion = parseVersion(stderr);
        resolve({ major: parseInt(fullVersion.split('.')[0], 10), full: fullVersion });
      });
    });
  }
}

async function checkJavaPath(path: string | undefined, source: string) {
  if (path) {
    try {
      const javaVersion = await getJavaVersion(path);
      if (javaVersion.major >= 25) {
        logger.log(`Found ${source} Version: ${javaVersion} at ${path}`);
        return true;
      } else {
        logger.info(`Bad Java version ${javaVersion} at ${path} from ${source}`);
      }
    } catch (err) {
      logger.log(`Could not parse Java version from ${source}, skipping`, err);
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
  // Then check the WPILib home directory for the WPILib jdk
  const wpilibHome = api.getUtilitiesAPI().getWPILibHomeDir();
  const wpilibHomeJava = path.join(wpilibHome, 'jdk');
  if (await checkJavaPath(wpilibHomeJava, 'WPILib Home JDK')) {
    return wpilibHomeJava;
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
