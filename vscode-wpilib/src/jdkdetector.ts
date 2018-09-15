'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { getIsWindows, promisifyExists } from './utilities';

function getJavacIs11(command: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    cp.exec(command + ' -version', (err, stdout) => {
      if (err) {
        resolve(false);
      } else {
        if (stdout.startsWith('javac 11')) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}

export async function findJdkPath(api: IExternalAPI): Promise<string | undefined> {
  // Check for java property, as thats easily user settable, and we want it to win
  const vscodeJavaHome = vscode.workspace.getConfiguration('java').get<string>('home');
  if (vscodeJavaHome) {
    let javaHomeJavac = path.join(vscodeJavaHome, 'bin', 'javac');
    javaHomeJavac = getIsWindows() ? javaHomeJavac + '.exe' : javaHomeJavac;
    if (await promisifyExists(javaHomeJavac)) {
      const isJava11 = await getJavacIs11(javaHomeJavac);
      if (isJava11) {
        return vscodeJavaHome;
      }
    }
  }

  // Then check the FRC home directory for the FRC jdk
  const frcHome = api.getUtilitiesAPI().getWPILibHomeDir();
  let frcHomeJavac = path.join(frcHome, 'jdk', 'bin', 'javac');
  frcHomeJavac = getIsWindows() ? frcHomeJavac + '.exe' : frcHomeJavac;
  if (await promisifyExists(frcHomeJavac)) {
    const isJava11 = await getJavacIs11(frcHomeJavac);
    if (isJava11) {
      return path.join(frcHome, 'jdk');
    }
  }

  // Check for java home
  const javaHome = process.env.JAVA_HOME;
  if (javaHome !== undefined) {
    let javaHomeJavac = path.join(javaHome, 'bin', 'javac');
    javaHomeJavac = getIsWindows() ? javaHomeJavac + '.exe' : javaHomeJavac;
    if (await promisifyExists(javaHomeJavac)) {
      const isJava11 = await getJavacIs11(javaHomeJavac);
      if (isJava11) {
        return javaHome;
      }
    }
  }

  // Check for jdk home
  const jdkHome = process.env.JDK_HOME;
  if (jdkHome !== undefined) {
    let jdkHomeJavac = path.join(jdkHome, 'bin', 'javac');
    jdkHomeJavac = getIsWindows() ? jdkHomeJavac + '.exe' : jdkHomeJavac;
    if (await promisifyExists(jdkHomeJavac)) {
      const isJava11 = await getJavacIs11(jdkHomeJavac);
      if (isJava11) {
        return jdkHome;
      }
    }
  }

  // Finally check path
  {
    const isJava11 = await getJavacIs11('javac');
    if (isJava11) {
      return '';
    }
  }

  return undefined;
}
