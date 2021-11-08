import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import { copyFileAsync, mkdirpAsync, ncpAsync, readdirAsync, readFileAsync, writeFileAsync } from '../utilities';
import { setExecutePermissions } from './permissions';

type CopyCallback = (srcFolder: string, rootFolder: string) => Promise<boolean>;

export async function generateCopyCpp(resourcesFolder: string, fromTemplateFolder: string | CopyCallback, fromGradleFolder: string, toFolder: string,
                                      addCpp: boolean, directGradleImport: boolean, oldCommands: boolean): Promise<boolean> {
  try {
    const existingFiles = await readdirAsync(toFolder);
    if (existingFiles.length > 0) {
      logger.warn('folder not empty');
      return false;
    }

    let codePath = path.join(toFolder, 'src', 'main');
    if (addCpp) {
      codePath = path.join(codePath, 'cpp');
    } else if (directGradleImport) {
      codePath = path.join(toFolder, 'src');
    }

    const gradleRioFrom = '###GRADLERIOREPLACE###';

    const grRoot = path.dirname(fromGradleFolder);

    const grVersionFile = path.join(grRoot, 'version.txt');

    const grVersionTo = (await readFileAsync(grVersionFile, 'utf8')).trim();

    if (typeof fromTemplateFolder === 'string') {
      await ncpAsync(fromTemplateFolder, codePath);
    } else {
      await fromTemplateFolder(codePath, toFolder);
    }
    await ncpAsync(fromGradleFolder, toFolder, {
      filter: (cf): boolean => {
        const rooted = path.relative(fromGradleFolder, cf);
        if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
          return false;
        }
        return true;
      },
    });
    await ncpAsync(path.join(grRoot, 'shared'), toFolder, {
      filter: (cf): boolean => {
        const rooted = path.relative(fromGradleFolder, cf);
        if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
          return false;
        }
        return true;
      },
    });

    await setExecutePermissions(path.join(toFolder, 'gradlew'));

    const buildgradle = path.join(toFolder, 'build.gradle');

    await new Promise<void>((resolve, reject) => {
      fs.readFile(buildgradle, 'utf8', (err, dataIn) => {
        if (err) {
          resolve();
        } else {
          const dataOut = dataIn.replace(new RegExp(gradleRioFrom, 'g'), grVersionTo);
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

    if (!directGradleImport) {
      const deployDir = path.join(toFolder, 'src', 'main', 'deploy');

      await mkdirpAsync(deployDir);

      await writeFileAsync(path.join(deployDir, 'example.txt'), i18n('generator', ['generateCppDeployHint',
        `Files placed in this directory will be deployed to the RoboRIO into the
  'deploy' directory in the home folder. Use the 'frc::filesystem::GetDeployDirectory'
  function from the 'frc/Filesystem.h' header to get a proper path relative to the deploy
  directory.` ]));
    }

    const vendorDir = path.join(toFolder, 'vendordeps');
    await mkdirpAsync(vendorDir);
    const commandName = oldCommands ? 'WPILibOldCommands.json' : 'WPILibNewCommands.json';
    const vendorFile = path.join(path.dirname(resourcesFolder), 'vendordeps', commandName);
    await copyFileAsync(vendorFile, path.join(vendorDir, commandName));

    return true;
  } catch (e) {
    logger.error('Project creation failure', e);
    return false;
  }
}

export async function generateCopyJava(resourcesFolder: string, fromTemplateFolder: string | CopyCallback, fromGradleFolder: string, toFolder: string,
                                       robotClassTo: string, copyRoot: string, directGradleImport: boolean, oldCommands: boolean,
                                       packageReplaceString?: string | undefined): Promise<boolean> {
  try {
    const existingFiles = await readdirAsync(toFolder);
    if (existingFiles.length > 0) {
      return false;
    }

    const rootCodePath = path.join(toFolder, 'src', 'main', 'java');
    let codePath = path.join(rootCodePath, copyRoot);
    if (directGradleImport) {
      codePath = path.join(toFolder, 'src');
    }

    if (typeof fromTemplateFolder === 'string') {
      await ncpAsync(fromTemplateFolder, codePath);
    } else {
      await fromTemplateFolder(codePath, toFolder);
    }

    const files = await new Promise<string[]>((resolve, reject) => {
      glob('**/*{.java,.gradle}', {
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
    const gradleRioFrom = '###GRADLERIOREPLACE###';

    const grRoot = path.dirname(fromGradleFolder);

    const grVersionFile = path.join(grRoot, 'version.txt');

    const grVersionTo = (await readFileAsync(grVersionFile, 'utf8')).trim();

    const promiseArray: Promise<void>[] = [];

    for (const f of files) {
      const file = path.join(codePath, f);
      promiseArray.push(new Promise<void>((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, dataIn) => {
          if (err) {
            reject(err);
          } else {
            let dataOut = dataIn.replace(new RegExp(replacePackageFrom, 'g'), replacePackageTo);
            if (packageReplaceString !== undefined) {
              dataOut = dataOut.replace(new RegExp(packageReplaceString, 'g'), replacePackageTo);
            }
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

    await Promise.all(promiseArray);

    await ncpAsync(fromGradleFolder, toFolder, {
      filter: (cf): boolean => {
        const rooted = path.relative(fromGradleFolder, cf);
        if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
          return false;
        }
        return true;
      },
    });
    await ncpAsync(path.join(grRoot, 'shared'), toFolder, {
      filter: (cf): boolean => {
        const rooted = path.relative(fromGradleFolder, cf);
        if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
          return false;
        }
        return true;
      },
    });

    await setExecutePermissions(path.join(toFolder, 'gradlew'));

    const buildgradle = path.join(toFolder, 'build.gradle');

    await new Promise<void>((resolve, reject) => {
      fs.readFile(buildgradle, 'utf8', (err, dataIn) => {
        if (err) {
          resolve();
        } else {
          const dataOut = dataIn.replace(new RegExp(robotClassFrom, 'g'), robotClassTo)
            .replace(new RegExp(gradleRioFrom, 'g'), grVersionTo);
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

    if (!directGradleImport) {
      const deployDir = path.join(toFolder, 'src', 'main', 'deploy');

      await mkdirpAsync(deployDir);

      await writeFileAsync(path.join(deployDir, 'example.txt'), i18n('generator', ['generateJavaDeployHint',
        `Files placed in this directory will be deployed to the RoboRIO into the
'deploy' directory in the home folder. Use the 'Filesystem.getDeployDirectory' wpilib function
to get a proper path relative to the deploy directory.` ]));
    }

    const vendorDir = path.join(toFolder, 'vendordeps');
    await mkdirpAsync(vendorDir);
    const commandName = oldCommands ? 'WPILibOldCommands.json' : 'WPILibNewCommands.json';
    const vendorFile = path.join(path.dirname(resourcesFolder), 'vendordeps', commandName);
    await copyFileAsync(vendorFile, path.join(vendorDir, commandName));

    return true;
  } catch (e) {
    logger.error('Project creation failure', e);
    return false;
  }
}

export function setDesktopEnabled(buildgradle: string, setting: boolean): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.readFile(buildgradle, 'utf8', (err, dataIn) => {
      if (err) {
        resolve();
      } else {
        const dataOut = dataIn.replace(/def\s+includeDesktopSupport\s*=\s*(true|false)/gm,
          `def includeDesktopSupport = ${setting ? 'true' : 'false'}`);
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
}
