import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import {
  copyFileAsync,
  mkdirpAsync,
  ncpAsync,
  readdirAsync,
  readFileAsync,
  writeFileAsync,
} from '../utilities';
import { setExecutePermissions } from './permissions';

type CopyCallback = (srcFolder: string, rootFolder: string) => Promise<boolean>;

export async function generateCopyCpp(
  resourcesFolder: string,
  fromTemplateFolder: string | CopyCallback,
  fromTemplateTestFolder: string | undefined,
  fromGradleFolder: string,
  toFolder: string,
  directGradleImport: boolean,
  extraVendordeps: string[]
): Promise<boolean> {
  try {
    const existingFiles = await readdirAsync(toFolder);
    if (existingFiles.length > 0) {
      logger.warn('folder not empty');
      return false;
    }

    let codePath = path.join(toFolder, 'src', 'main');
    const testPath = path.join(toFolder, 'src', 'test');
    if (directGradleImport) {
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
    if (fromTemplateTestFolder !== undefined) {
      await ncpAsync(fromTemplateTestFolder, testPath);
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

      await writeFileAsync(
        path.join(deployDir, 'example.txt'),
        i18n('generator', [
          'generateCppDeployHint',
          `Files placed in this directory will be deployed to the RoboRIO into the
  'deploy' directory in the home folder. Use the 'frc::filesystem::GetDeployDirectory'
  function from the 'frc/Filesystem.h' header to get a proper path relative to the deploy
  directory.`,
        ])
      );
    }

    const vendorDir = path.join(toFolder, 'vendordeps');
    await mkdirpAsync(vendorDir);

    const commandName = 'WPILibNewCommands.json';
    const vendorFile = path.join(path.dirname(resourcesFolder), 'vendordeps', commandName);
    await copyFileAsync(vendorFile, path.join(vendorDir, commandName));

    for (const vendordep of extraVendordeps) {
      if (vendordep === 'romi') {
        const romiVendordepName = 'RomiVendordep.json';
        const romiVendordepFile = path.join(
          path.dirname(resourcesFolder),
          'vendordeps',
          romiVendordepName
        );
        await copyFileAsync(romiVendordepFile, path.join(vendorDir, romiVendordepName));
      } else if (vendordep === 'xrp') {
        const xrpVendordepName = 'XRPVendordep.json';
        const xrpVendordepFile = path.join(
          path.dirname(resourcesFolder),
          'vendordeps',
          xrpVendordepName
        );
        await copyFileAsync(xrpVendordepFile, path.join(vendorDir, xrpVendordepName));
      }
    }

    return true;
  } catch (e) {
    logger.error('Project creation failure', e);
    return false;
  }
}

export async function generateCopyJava(
  resourcesFolder: string,
  fromTemplateFolder: string | CopyCallback,
  fromTemplateTestFolder: string | undefined,
  fromGradleFolder: string,
  toFolder: string,
  robotClassTo: string,
  copyRoot: string,
  directGradleImport: boolean,
  extraVendordeps: string[],
  packageReplaceString?: string | undefined
): Promise<boolean> {
  try {
    const existingFiles = await readdirAsync(toFolder);
    if (existingFiles.length > 0) {
      return false;
    }

    const rootCodePath = path.join(toFolder, 'src', 'main', 'java');
    const rootTestPath = path.join(toFolder, 'src', 'test', 'java');
    let codePath = path.join(rootCodePath, copyRoot);
    const testPath = path.join(rootTestPath, copyRoot);
    if (directGradleImport) {
      codePath = path.join(toFolder, 'src');
    }

    if (typeof fromTemplateFolder === 'string') {
      await ncpAsync(fromTemplateFolder, codePath);
    } else {
      await fromTemplateFolder(codePath, toFolder);
    }
    if (fromTemplateTestFolder !== undefined) {
      await ncpAsync(fromTemplateTestFolder, testPath);
    }

    let files: string[];
    try {
      files = await glob('**/*{.java,.gradle}', {
        cwd: codePath,
        nodir: true,
      });
    } catch (err) {
      logger.error('Failed to glob files', err);
      return false;
    }

    // Package replace inside the template

    const replacePackageFrom =
      'edu\\.wpi\\.first\\.wpilibj\\.(?:examples|templates)\\..+?(?=;|\\.)';
    const replacePackageTo = 'frc.robot';

    const robotClassFrom = '###ROBOTCLASSREPLACE###';
    const gradleRioFrom = '###GRADLERIOREPLACE###';

    const grRoot = path.dirname(fromGradleFolder);

    const grVersionFile = path.join(grRoot, 'version.txt');

    const grVersionTo = (await readFileAsync(grVersionFile, 'utf8')).trim();

    const promiseArray: Promise<void>[] = [];

    for (const f of files) {
      const file = path.join(codePath, f);
      promiseArray.push(
        new Promise<void>((resolve, reject) => {
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
        })
      );
    }

    if (fromTemplateTestFolder !== undefined) {
      let testFiles: string[];
      try {
        testFiles = await glob('**/*{.java,.gradle}', {
          cwd: testPath,
          nodir: true,
        });
      } catch (err) {
        logger.error('Failed to glob test files', err);
        return false;
      }

      for (const f of testFiles) {
        const file = path.join(testPath, f);
        promiseArray.push(
          new Promise<void>((resolve, reject) => {
            fs.readFile(file, 'utf8', (err, dataIn) => {
              if (err) {
                reject(err);
              } else {
                let dataOut = dataIn.replace(new RegExp(replacePackageFrom, 'g'), replacePackageTo);
                if (packageReplaceString !== undefined) {
                  dataOut = dataOut.replace(
                    new RegExp(packageReplaceString, 'g'),
                    replacePackageTo
                  );
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
          })
        );
      }
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
          const dataOut = dataIn
            .replace(new RegExp(robotClassFrom, 'g'), robotClassTo)
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

      await writeFileAsync(
        path.join(deployDir, 'example.txt'),
        i18n('generator', [
          'generateJavaDeployHint',
          `Files placed in this directory will be deployed to the RoboRIO into the
'deploy' directory in the home folder. Use the 'Filesystem.getDeployDirectory' wpilib function
to get a proper path relative to the deploy directory.`,
        ])
      );
    }

    const vendorDir = path.join(toFolder, 'vendordeps');
    await mkdirpAsync(vendorDir);
    const commandName = 'WPILibNewCommands.json';
    const vendorFile = path.join(path.dirname(resourcesFolder), 'vendordeps', commandName);
    await copyFileAsync(vendorFile, path.join(vendorDir, commandName));

    for (const vendordep of extraVendordeps) {
      if (vendordep === 'romi') {
        const romiVendordepName = 'RomiVendordep.json';
        const romiVendordepFile = path.join(
          path.dirname(resourcesFolder),
          'vendordeps',
          romiVendordepName
        );
        await copyFileAsync(romiVendordepFile, path.join(vendorDir, romiVendordepName));
      } else if (vendordep === 'xrp') {
        const xrpVendordepName = 'XRPVendordep.json';
        const xrpVendordepFile = path.join(
          path.dirname(resourcesFolder),
          'vendordeps',
          xrpVendordepName
        );
        await copyFileAsync(xrpVendordepFile, path.join(vendorDir, xrpVendordepName));
      }
    }

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
        const dataOut = dataIn.replace(
          /def\s+includeDesktopSupport\s*=\s*(true|false)/gm,
          `def includeDesktopSupport = ${setting ? 'true' : 'false'}`
        );
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
