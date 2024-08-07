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

export async function findJdkPath(api: IExternalAPI): Promise<string | undefined> {
  // Check for java property, as thats easily user settable, and we want it to win
  const vscodeJavaHome = vscode.workspace.getConfiguration('java').get<string>('jdt.ls.java.home');
  if (vscodeJavaHome) {
    try {
      const javaVersion = await getJavaVersion(vscodeJavaHome);
      if (javaVersion >= 17) {
        logger.log(`Found jdt.ls.java.home Version: ${javaVersion} at ${vscodeJavaHome}`);
        return vscodeJavaHome;
      } else {
        logger.info(`Bad Java version ${javaVersion} at ${vscodeJavaHome} from jdt.ls.java.home Version`);
      }
    } catch (err) {
      logger.log('Error loading java from jdt.ls.java.home, skipping', err);
    }
  }

  // Check for deprecated java property, as that was used before 2024
  const vscodeOldJavaHome = vscode.workspace.getConfiguration('java').get<string>('home');
  if (vscodeOldJavaHome) {
    try {
      const javaVersion = await getJavaVersion(vscodeOldJavaHome);
      if (javaVersion >= 17) {
        logger.log(`Found Java Home Version: ${javaVersion} at ${vscodeOldJavaHome}`);
        return vscodeOldJavaHome;
      } else {
        logger.info(`Bad Java version ${javaVersion} at ${vscodeOldJavaHome} from java.home`);
      }
    } catch (err) {
      logger.log('Error loading java from java.home, skipping', err);
    }
  }

  // Then check the FRC home directory for the FRC jdk
  const frcHome = api.getUtilitiesAPI().getWPILibHomeDir();
  {
    const frcHomeJava = path.join(frcHome, 'jdk');
    try {
      const javaVersion = await getJavaVersion(frcHomeJava);
      if (javaVersion >= 17) {
        logger.log(`Found Java Home Version: ${javaVersion} at ${frcHomeJava}`);
        return frcHomeJava;
      } else {
        logger.info(`Bad Java version ${javaVersion} at ${frcHomeJava}`);
      }
    } catch (err) {
      logger.log('Error loading java from frc home, skipping', err);
    }
  }

  // Check for java home
  const javaHome = process.env.JAVA_HOME;
  if (javaHome !== undefined) {
    try {
      const javaVersion = await getJavaVersion(javaHome);
      if (javaVersion >= 17) {
        logger.log(`Found Java Home Version: ${javaVersion} at ${javaHome}`);
        return javaHome;
      } else {
        logger.info(`Bad Java version ${javaVersion} at ${javaHome} from JAVA_HOME`);
      }
    } catch (err) {
      logger.log('Error loading java from JAVA_HOME, skipping', err);
    }
  }

  // Check for jdk home
  const jdkHome = process.env.JDK_HOME;
  if (jdkHome !== undefined) {
    try {
      const javaVersion = await getJavaVersion(jdkHome);
      if (javaVersion >= 17) {
        logger.log(`Found Java Home Version: ${javaVersion} at ${jdkHome}`);
        return jdkHome;
      } else {
        logger.info(`Bad Java version ${javaVersion} at ${jdkHome} from JDK_HOME`);
      }
    } catch (err) {
      logger.log('Error loading java from JDK_HOME, skipping', err);
    }
  }

  return undefined;
}
