'use strict';

import * as electron from 'electron';
import * as path from 'path';
import { promisifyReadFile } from './utilities';

const dialog = electron.remote.dialog;
const bWindow = electron.remote.getCurrentWindow();

export function projectSelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  dialog.showOpenDialog(bWindow, {
    buttonLabel: 'Select Folder',
    defaultPath: electron.remote.app.getPath('documents'),
    message: 'Select a folder to put the project in',
    properties: [
      'openDirectory',
    ],
    title: 'Select a folder to put the project in',
  }, (paths) => {
    if (paths && paths.length === 1) {
      const input = document.getElementById('projectFolder') as HTMLInputElement;
      input.value = paths[0];
    } else {
      // TODO
    }
  });
}

export function selectProjectType() {
  const select = document.getElementById('projectTypeSelect') as HTMLSelectElement;
  if (select.value !== 'base') {
    // Not a base, enable lang
    const baseSelect = document.getElementById('projectBaseSelect') as HTMLSelectElement;
    const langSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    langSelect.disabled = false;
    langSelect.value = 'base';
    baseSelect.disabled = true;
    baseSelect.value = 'base';
  } else {
    const baseSelect = document.getElementById('projectBaseSelect') as HTMLSelectElement;
    const langSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    langSelect.disabled = true;
    langSelect.value = 'base';
    baseSelect.disabled = true;
    baseSelect.value = 'base';
  }
}

export function selectLanguage() {
  const select = document.getElementById('languageSelect') as HTMLSelectElement;
  if (select.value !== 'base') {
    // Not a base, enable lang
    const baseSelect = document.getElementById('projectBaseSelect') as HTMLSelectElement;
    const typeSelect = document.getElementById('projectTypeSelect') as HTMLSelectElement;
    if (typeSelect.value !== 'robotbuilder') {
      setupBaseSelects(typeSelect.value === 'template', select.value === 'java');
      baseSelect.disabled = false;
    }
  } else {
    const baseSelect = document.getElementById('projectBaseSelect') as HTMLSelectElement;
    baseSelect.disabled = true;
    baseSelect.value = 'base';
  }
}

export function selectRobotBase() {

  //
}

export async function generateProjectButtonClick() {
  const typeSelect = document.getElementById('projectTypeSelect') as HTMLSelectElement;
  const langSelect = document.getElementById('languageSelect') as HTMLSelectElement;
  const baseSelect = document.getElementById('projectBaseSelect') as HTMLSelectElement;

  if (typeSelect.value === 'base' || langSelect.type === 'base') {
    alert('project type or language not selected');
    return;
  }
  if (typeSelect.value === 'robotbuilder') {
    // RobotBuilder
    await handleProjectGenerate(true, false, langSelect.value === 'java', '');
  } else if (baseSelect.value === 'base') {
    // No base selected, error
    alert('project base not selected');
    return;
  } else {
    await handleProjectGenerate(false, typeSelect.value === 'template', langSelect.value === 'java', baseSelect.value);
  }
}

async function handleProjectGenerate(robotbuilder: boolean, _template: boolean, _java: boolean, _base: string) {
  const projectFolder = (document.getElementById('projectFolder') as HTMLInputElement).value;
  // const projectName = (document.getElementById('projectName') as HTMLInputElement).value;
  // const newFolderCB = (document.getElementById('newFolderCB') as HTMLInputElement).checked;
  // const teamNumber = (document.getElementById('teamNumber') as HTMLInputElement).value;
  // const desktopCB = (document.getElementById('desktopCB') as HTMLInputElement).checked;

  if (!path.isAbsolute(projectFolder)) {
    alert('Can only extract to absolute path');
    return;
  }

  if (robotbuilder) {
    // Robot builder generation

  }
}

interface IDisplayJSON {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  gradlebase: string;
}

const remote = electron.remote;
// const dialog = remote.dialog;
const app = remote.app;
// const shell = electron.shell;
const basepath = app.getAppPath();

console.log(basepath);

let resourceRoot = path.join(basepath, 'resources');
if (basepath.indexOf('default_app.asar') >= 0) {
  resourceRoot = 'resources';
}
const examplesFileName = 'examples.json';
const templatesFileName = 'templates.json';
const cppRoot = path.join(resourceRoot, 'cpp', 'src');
const gradleRoot = path.join(resourceRoot, 'gradle');
const cppTemplatesRoot = path.join(cppRoot, 'templates');
const cppExamplesRoot = path.join(cppRoot, 'examples');
const cppTemplatesFile = path.join(cppTemplatesRoot, templatesFileName);
const cppExamplesFile = path.join(cppExamplesRoot, examplesFileName);
const javaRoot = path.join(resourceRoot, 'java', 'src');
const javaTemplatesRoot = path.join(javaRoot, 'templates');
const javaExamplesRoot = path.join(javaRoot, 'examples');
const javaTemplatesFile = path.join(javaTemplatesRoot, templatesFileName);
const javaExamplesFile = path.join(javaExamplesRoot, examplesFileName);

let projectRootPath = app.getPath('home');
if (process.platform === 'win32') {
  projectRootPath = app.getPath('documents');
}

let javaTemplatesContents: IDisplayJSON[] = [];
let javaExamplesContents: IDisplayJSON[] = [];
let cppTemplatesContents: IDisplayJSON[] = [];
let cppExamplesContents: IDisplayJSON[] = [];

window.addEventListener('load', async () => {
  javaTemplatesContents = JSON.parse(await promisifyReadFile(javaTemplatesFile)) as IDisplayJSON[];
  javaExamplesContents = JSON.parse(await promisifyReadFile(javaExamplesFile)) as IDisplayJSON[];
  cppTemplatesContents = JSON.parse(await promisifyReadFile(cppTemplatesFile)) as IDisplayJSON[];
  cppExamplesContents = JSON.parse(await promisifyReadFile(cppExamplesFile)) as IDisplayJSON[];
  console.log(javaExamplesContents);
  console.log(cppTemplatesContents);
  console.log(cppExamplesContents);
  console.log(javaTemplatesContents);
  console.log(projectRootPath);
  console.log(gradleRoot);
});

document.addEventListener('keydown', (e) => {
  if (e.which === 123) {
    bWindow.webContents.openDevTools();
  } else if (e.which === 116) {
    location.reload();
  }
});

function setupBaseSelects(template: boolean, java: boolean) {
  const select = document.getElementById('projectBaseSelect') as HTMLSelectElement;
  select.options.length = 0;
  const baseElement = document.createElement('option'); // new HTMLOptionElement();
  baseElement.value = 'base';
  baseElement.innerText = 'Select a project base';
  select.add(baseElement);
  if (template && java) {
    // java template
    for (const item of javaTemplatesContents) {
      const newElement = document.createElement('option');
      newElement.value = item.name;
      newElement.innerText = item.name;
      select.add(newElement);
    }
  } else if (java) {
    // java example
    for (const item of javaExamplesContents) {
      const newElement = document.createElement('option');
      newElement.value = item.name;
      newElement.innerText = item.name;
      select.add(newElement);
    }
  } else if (template) {
    // cpp template
    for (const item of cppTemplatesContents) {
      const newElement = document.createElement('option');
      newElement.value = item.name;
      newElement.innerText = item.name;
      select.add(newElement);
    }
  } else {
    // cpp example
    for (const item of cppExamplesContents) {
      const newElement = document.createElement('option');
      newElement.value = item.name;
      newElement.innerText = item.name;
      select.add(newElement);
    }
  }
}

/*

export function projectTypeButton() {
  (document.getElementById('projectType') as HTMLButtonElement).style.display = 'none';
  const select = (document.getElementById('projectTypeSelect') as HTMLSelectElement);
  select.style.display = 'block';
}

export function selectProjectType() {
  (document.activeElement as HTMLElement).blur();

  const projectSelect = document.getElementById('projectType') as HTMLSelectElement;

  if (projectSelect.options[projectSelect.selectedIndex].value === 'template') {
    // template = true;
  }
}

export function selectLanguage() {
  (document.activeElement as HTMLElement).blur();
}

export function selectProjectBase() {
  (document.activeElement as HTMLElement).blur();
}

export function selectProjectFolder() {
  (document.activeElement as HTMLElement).blur();
}

export function generateProject() {
  (document.activeElement as HTMLElement).blur();
}
*/
