import * as ncp from 'ncp';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs';

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

export async function generateCopyCpp(fromTemplateFolder: string, fromGradleFolder: string, toFolder: string): Promise<void> {
  const codePath = path.join(toFolder, 'src');
  const src = promisifyNcp(fromTemplateFolder, codePath);
  const gradle = promisifyNcp(fromGradleFolder, toFolder, {
    filter: (cf): boolean => {
      const rooted = path.relative(fromGradleFolder, cf);
      if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
        return false;
      }
      return true;
    }
  });

  await Promise.all([src, gradle]);
}

export async function generateCopyJava(fromTemplateFolder: string, fromGradleFolder: string, toFolder: string): Promise<void> {
  const rootCodePath = path.join(toFolder, 'src', 'main', 'java');
  const codePath = path.join(rootCodePath, 'frc', 'robot');
  await promisifyNcp(fromTemplateFolder, codePath);

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

  const ncpPromise = promisifyNcp(fromGradleFolder, toFolder, {
    filter: (cf): boolean => {
      const rooted = path.relative(fromGradleFolder, cf);
      if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
        return false;
      }
      return true;
    }
  });
  promiseArray.push(ncpPromise);
  await Promise.all(promiseArray);
}
