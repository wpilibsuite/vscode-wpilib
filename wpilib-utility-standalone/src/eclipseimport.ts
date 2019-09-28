'use strict';

import * as electron from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateCopyCpp, generateCopyJava } from './shared/generator';
import { existsAsync, mkdirpAsync, readFileAsync, writeFileAsync } from './utilities';

const dialog = electron.remote.dialog;
const bWindow = electron.remote.getCurrentWindow();

// tslint:disable-next-line:no-var-requires
const javaProperties = require('java-properties');

document.addEventListener('keydown', (e) => {
  if (e.which === 123) {
    bWindow.webContents.openDevTools();
  } else if (e.which === 116) {
    location.reload();
  }
});

export async function eclipseSelectButtonClick(): Promise<void> {
  (document.activeElement as HTMLElement).blur();
  const paths = await dialog.showOpenDialog(bWindow, {
    buttonLabel: 'Select Project',
    defaultPath: path.join(os.homedir(), 'eclipse-workspace'),
    filters: [
      {
        extensions: ['properties'],
        name: 'Eclipse Project',
      },
    ],
    message: 'Select a Project',
    title: 'Select a Project',
  });
  if (paths.filePaths && paths.filePaths.length === 1) {
    const input = document.getElementById('eclipseInput') as HTMLInputElement;
    input.value = paths.filePaths[0];
    const project = document.getElementById('projectName') as HTMLInputElement;
    project.disabled = false;
    project.value = path.basename(path.dirname(paths.filePaths[0]));
  } else {
    // TODO
  }
}

export async function projectSelectButtonClick(): Promise<void> {
  (document.activeElement as HTMLElement).blur();
  const paths = await dialog.showOpenDialog(bWindow, {
    buttonLabel: 'Select Folder',
    defaultPath: electron.remote.app.getPath('documents'),
    message: 'Select a folder to put the project in',
    properties: [
      'openDirectory',
    ],
    title: 'Select a folder to put the project in',
  });
  if (paths.filePaths && paths.filePaths.length === 1) {
    const input = document.getElementById('projectFolder') as HTMLInputElement;
    input.value = paths.filePaths[0];
  } else {
    // TODO
  }
}

interface IImportProject {
  fromProps: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

export async function importProjectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  const data: IImportProject = {
    fromProps: (document.getElementById('eclipseInput') as HTMLInputElement).value,
    newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
    projectName: (document.getElementById('projectName') as HTMLInputElement).value,
    teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
    toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
  };

  const oldProjectPath = path.dirname(data.fromProps);

  const cpp = await existsAsync(path.join(oldProjectPath, '.cproject'));

  // tslint:disable-next-line:no-unsafe-any
  const values = javaProperties.of(data.fromProps);

  // tslint:disable-next-line:no-unsafe-any
  const javaRobotClass: string = values.get('robot.class', '');

  let toFolder = data.toFolder;

  if (data.newFolder) {
    toFolder = path.join(data.toFolder, data.projectName);
  }

  try {
    await mkdirpAsync(toFolder);
  } catch {
    //
  }

  const basepath = electron.remote.app.getAppPath();
  let resourceRoot = path.join(basepath, 'resources');
  if (basepath.indexOf('default_app.asar') >= 0) {
    resourceRoot = 'resources';
  }

  const gradleBasePath = path.join(resourceRoot, 'gradle');

  let success = false;
  if (cpp) {
    const gradlePath = path.join(gradleBasePath, 'cpp');
    success = await generateCopyCpp(path.join(oldProjectPath, 'src'), gradlePath, toFolder, true);
  } else {
    const gradlePath = path.join(gradleBasePath, 'java');
    success = await generateCopyJava(path.join(oldProjectPath, 'src'), gradlePath, toFolder, javaRobotClass, '');
  }

  if (!success) {
    return;
  }

  const buildgradle = path.join(toFolder, 'build.gradle');

  await new Promise<void>((resolve, reject) => {
    fs.readFile(buildgradle, 'utf8', (err, dataIn) => {
      if (err) {
        resolve();
      } else {
        const dataOut = dataIn.replace(new RegExp('def includeSrcInIncludeRoot = false', 'g'), 'def includeSrcInIncludeRoot = true');
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

  const jsonFilePath = path.join(toFolder, '.wpilib', 'wpilib_preferences.json');

  const parsed = JSON.parse(await readFileAsync(jsonFilePath, 'utf8'));
  // tslint:disable-next-line:no-unsafe-any
  parsed.teamNumber = parseInt(data.teamNumber, 10);
  await writeFileAsync(jsonFilePath, JSON.stringify(parsed, null, 4));

  const r = await dialog.showMessageBox({
    buttons: ['Open Folder', 'OK'],
    message: 'Creation of project complete',
    noLink: true,
  });
  if (r.response === 0) {
    console.log(toFolder);
    electron.shell.showItemInFolder(path.join(toFolder, 'build.gradle'));
  }
  console.log(r);
}
