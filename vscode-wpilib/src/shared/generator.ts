import * as fs from 'fs';
import * as glob from 'glob';
import * as mkdirp from 'mkdirp';
import * as ncp from 'ncp';
import * as path from 'path';
import { promisifyWriteFile } from '../utilities';
import { setExecutePermissions } from './permissions';

export function promisifyMkdirp(dest: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    mkdirp(dest, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function promisifyNcp(source: string, dest: string, options: ncp.Options = {}): Promise<void> {
  return promisifyMkdirp(dest).then(() => {
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

export function promisifyReadDir(pth: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(pth, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

export async function generateCopyCpp(fromTemplateFolder: string, fromGradleFolder: string, toFolder: string, addCpp: boolean): Promise<boolean> {
  const existingFiles = await promisifyReadDir(toFolder);
  if (existingFiles.length > 0) {
    return false;
  }

  let codePath = path.join(toFolder, 'src', 'main');
  if (addCpp) {
    codePath = path.join(codePath, 'cpp');
  }
  const src = promisifyNcp(fromTemplateFolder, codePath);
  const gradle = promisifyNcp(fromGradleFolder, toFolder, {
    filter: (cf): boolean => {
      const rooted = path.relative(fromGradleFolder, cf);
      if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
        return false;
      }
      return true;
    },
  });

  await Promise.all([src, gradle]);

  await setExecutePermissions(path.join(toFolder, 'gradlew'));

  await promisifyWriteFile(path.join(toFolder, 'src', 'main', 'deploy', 'example.txt'),
`Files placed in this directory will be deployed to the RoboRIO into the
'deploy' directory in the home folder. Use the 'frc::GetFilePath' function from
the 'frc/FileUtilities.h' header to get a proper path relative to the deploy
directory.`);

  return true;
}

export async function generateCopyJava(fromTemplateFolder: string, fromGradleFolder: string, toFolder: string,
                                       robotClassTo: string, copyRoot: string): Promise<boolean> {
  const existingFiles = await promisifyReadDir(toFolder);
  if (existingFiles.length > 0) {
    return false;
  }

  const rootCodePath = path.join(toFolder, 'src', 'main', 'java');
  const codePath = path.join(rootCodePath, copyRoot);
  await promisifyNcp(fromTemplateFolder, codePath);

  const files = await new Promise<string[]>((resolve, reject) => {
    glob('**/*', {
      cwd: codePath,
      nodir: true,
      nomount: true,
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

  const robotClassFrom = '###ROBOTCLASSREPLACE###';

  const promiseArray: Array<Promise<void>> = [];

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

  const ncpPromise = promisifyNcp(fromGradleFolder, toFolder, {
    filter: (cf): boolean => {
      const rooted = path.relative(fromGradleFolder, cf);
      if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
        return false;
      }
      return true;
    },
  });
  promiseArray.push(ncpPromise);
  await Promise.all(promiseArray);

  await setExecutePermissions(path.join(toFolder, 'gradlew'));

  const buildgradle = path.join(toFolder, 'build.gradle');

  await new Promise<void>((resolve, reject) => {
    fs.readFile(buildgradle, 'utf8', (err, dataIn) => {
      if (err) {
        resolve();
      } else {
        const dataOut = dataIn.replace(new RegExp(robotClassFrom, 'g'), robotClassTo);
        fs.writeFile(buildgradle, dataOut, 'utf8', (err1) => {
          if (err1) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });

  const deployDir = path.join(toFolder, 'src', 'main', 'deploy');

  await promisifyMkdirp(deployDir);

  await promisifyWriteFile(path.join(deployDir, 'example.txt'),
`Files placed in this directory will be deployed to the RoboRIO into the
'deploy' directory in the home folder. Use the 'FileUtilities.getFilePath' wpilib function
to get a proper path relative to the deploy directory.`);

  return true;
}
