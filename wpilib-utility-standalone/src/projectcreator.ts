'use strict';
/*
import * as electron from 'electron';
import * as path from 'path';
import { promisifyReadFile } from './utilities';

// let template = false;
// let language = '';
// let base = '';

// const dialog = electron.remote.dialog;
const bWindow = electron.remote.getCurrentWindow();

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
// const gradleRoot = path.join(resourceRoot, 'gradle');
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

// let javaTemplatesContents: IDisplayJSON[] = [];
//  let javaExamplesContents: IDisplayJSON[] = [];
let cppTemplatesContents: IDisplayJSON[] = [];
let cppExamplesContents: IDisplayJSON[] = [];

window.addEventListener('load', async () => {
  javaTemplatesContents = JSON.parse(await promisifyReadFile(javaTemplatesFile)) as IDisplayJSON[];
  javaExamplesContents = JSON.parse(await promisifyReadFile(javaExamplesFile)) as IDisplayJSON[];
  cppTemplatesContents = JSON.parse(await promisifyReadFile(cppTemplatesFile)) as IDisplayJSON[];
  cppExamplesContents = JSON.parse(await promisifyReadFile(cppExamplesFile)) as IDisplayJSON[];
  //
});

document.addEventListener('keydown', (e) => {
  if (e.which === 123) {
    bWindow.webContents.openDevTools();
  } else if (e.which === 116) {
    location.reload();
  }
});

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
