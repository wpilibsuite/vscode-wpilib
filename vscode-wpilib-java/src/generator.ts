import * as vscode from 'vscode';
import * as ncp from 'ncp';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs';

function promisifyNcp(source: string, dest: string, options: ncp.Options = {}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    mkdirp(dest, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }).then(() => {
    return new Promise<void>((resolve, reject) => {
      ncp.ncp(source, dest, options, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  });
}

export async function generateCopy(fromTemplateFolder: vscode.Uri, fromGradleFolder: vscode.Uri, toFolder: vscode.Uri): Promise<void> {
  const rootCodePath = path.join(toFolder.fsPath, 'src', 'main', 'java');
  const codePath = path.join(rootCodePath, 'frc', 'robot');
  await promisifyNcp(fromTemplateFolder.fsPath, codePath);

  const files = await new Promise<string[]>((resolve, reject) => {
    glob('**/*', {
      cwd: codePath,
      nomount: true,
      nodir: true
    }, (err, matches) => {
      if (err) {
        reject(err);
      } else {
        resolve(matches);
      }
    });
  });
  // Package replace inside the template

  const replacePackageFrom = 'edu\\.wpi\\.first\\.wpilibj\\.(?:examples|templates)\\..+?(?=;|\\.)';
  const replacePackageTo = 'frc.robot';

  const promiseArray: Promise<void>[] = [];

  for (const f of files) {
    const file = path.join(codePath, f);
    promiseArray.push(new Promise<void>((resolve, reject) => {
      fs.readFile(file, 'utf8', (err, dataIn) => {
        if (err) {
          reject(err);
        } else {
          const dataOut = dataIn.replace(new RegExp(replacePackageFrom, 'g'), replacePackageTo);
          fs.writeFile(file, dataOut, 'utf8', (err1) => {
            if (err1) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    }));
  }

  const ncpPromise = promisifyNcp(fromGradleFolder.fsPath, toFolder.fsPath, {
    filter: (cf): boolean => {
      const rooted = path.relative(fromGradleFolder.fsPath, cf);
      if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
        return false;
      }
      return true;
    }
  });
  promiseArray.push(ncpPromise);
  await Promise.all(promiseArray);
}
