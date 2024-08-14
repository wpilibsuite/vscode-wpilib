import * as electron from 'electron';
import { app, dialog, getCurrentWindow } from '@electron/remote';
import * as fs from 'fs';
import * as path from 'path';
import { generateCopyCpp, generateCopyJava } from './shared/generator';

const shell = electron.shell;
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

interface IDisplayJSON {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  gradlebase: string;
}

window.addEventListener('load', async () => {
  const mainDiv = document.getElementById('mainDiv');
  if (mainDiv === null) {
    return;
  }

  const radioForm = document.createElement('div');

  const languages: [string, (e?: Event) => void, (e?: Event) => void][] = [
    ['Java', handleJavaTemplates, handleJavaExamples],
    ['C++', handleCppTemplates, handleCppExamples],
  ];

  for (const languageDetails of languages) {
    const [language, templatesEventHandler, examplesEventHandler] = languageDetails;

    const languageLowerCase = language.toLocaleLowerCase();

    // Templates
    const templatesRadioButton = document.createElement('input');
    const templatesId = `${languageLowerCase}Radio`;

    templatesRadioButton.type = 'radio';
    templatesRadioButton.id = templatesId;
    templatesRadioButton.name = 'language';
    templatesRadioButton.value = languageLowerCase;

    templatesRadioButton.addEventListener('click', templatesEventHandler);

    const templatesRadioLabel = document.createElement('label');
    templatesRadioLabel.htmlFor = templatesId;
    templatesRadioLabel.innerText = `${language} Templates`;

    // Examples
    const examplesRadioButton = document.createElement('input');
    const examplesId = `${languageLowerCase}RadioExamples`;

    examplesRadioButton.type = 'radio';
    examplesRadioButton.id = examplesId;
    examplesRadioButton.name = 'language';
    examplesRadioButton.value = `${languageLowerCase}ex`;

    examplesRadioButton.addEventListener('click', examplesEventHandler);

    const examplesRadioLabel = document.createElement('label');
    examplesRadioLabel.htmlFor = examplesId;
    examplesRadioLabel.innerText = `${language} Examples`;

    // Add to the form
    radioForm.appendChild(templatesRadioButton);
    radioForm.appendChild(templatesRadioLabel);
    radioForm.appendChild(examplesRadioButton);
    radioForm.appendChild(examplesRadioLabel);
  }

  mainDiv.appendChild(radioForm);

  const itemsDiv = document.createElement('div');
  itemsDiv.id = 'shownItems';
  mainDiv.appendChild(itemsDiv);

  (document.getElementById('javaRadio') as HTMLInputElement).click();

});

function loadFile(fName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(fName, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function handleJavaTemplates() {
  const contents = await loadFile(javaTemplatesFile);
  const parsed: IDisplayJSON[] = JSON.parse(contents) as IDisplayJSON[];
  displayItems(parsed, javaTemplatesRoot, true);
}

async function handleJavaExamples() {
  const contents = await loadFile(javaExamplesFile);
  const parsed: IDisplayJSON[] = JSON.parse(contents) as IDisplayJSON[];
  displayItems(parsed, javaExamplesRoot, true);
}

async function handleCppTemplates() {
  const contents = await loadFile(cppTemplatesFile);
  const parsed: IDisplayJSON[] = JSON.parse(contents) as IDisplayJSON[];
  displayItems(parsed, cppTemplatesRoot, false);
}

async function handleCppExamples() {
  const contents = await loadFile(cppExamplesFile);
  const parsed: IDisplayJSON[] = JSON.parse(contents) as IDisplayJSON[];
  displayItems(parsed, cppTemplatesRoot, false);
}

function displayItems(toDisplay: IDisplayJSON[], rootFolder: string, java: boolean) {
  const itemsDiv = document.getElementById('shownItems');
  if (itemsDiv === null) {
    return;
  }
  itemsDiv.innerHTML = '';
  const ul = document.createElement('ul');
  ul.id = 'list';
  ul.style.listStyleType = 'none';
  ul.style.padding = '0';
  for (const d of toDisplay) {
    const li = document.createElement('li');
    const bdiv = document.createElement('div');
    const b = document.createElement('button');
    if (java) {
      b.addEventListener('click', async () => {
        await handleJavaCreate(d, rootFolder);
      });
    } else {
      b.addEventListener('click', async () => {
        await handleCppCreate(d, rootFolder);
      });
    }
    b.appendChild(document.createTextNode('Create'));
    const header = document.createElement('h3');
    header.style.margin = '0px';
    header.appendChild(document.createTextNode(d.name));
    li.appendChild(header);
    bdiv.appendChild(b);
    li.appendChild(document.createTextNode(d.description));
    li.appendChild(bdiv);
    li.appendChild(document.createElement('hr'));
    ul.appendChild(li);
  }
  itemsDiv.appendChild(ul);
}

document.addEventListener('keydown', (e) => {
  if (e.key === '{') {
    getCurrentWindow().webContents.toggleDevTools();
  } else if (e.key === '}') {
    location.reload();
  }
});

async function askForFolder(): Promise<string[]> {
  const paths = await dialog.showOpenDialog({
    defaultPath: projectRootPath,
    properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
  });
  if (paths.filePaths === undefined) {
    return [];
  }
  return paths.filePaths;
}

async function handleCppCreate(_item: IDisplayJSON, _srcRoot: string): Promise<void> {
  const dirArr = await askForFolder();
  if (dirArr === undefined) {
    return;
  }
  const toFolder = dirArr[0];

  const templateFolder = path.join(_srcRoot, _item.foldername);
  const result = await generateCopyCpp(resourceRoot, templateFolder, undefined, path.join(gradleRoot, _item.gradlebase), toFolder, false, []);
  if (!result) {
    await dialog.showMessageBox({
      message: 'Cannot extract into non empty directory',
      noLink: true,
    });
  }
}

async function handleJavaCreate(_item: IDisplayJSON, _srcRoot: string): Promise<void> {
  const dirArr = await askForFolder();
  if (dirArr === undefined) {
    return;
  }
  const toFolder = dirArr[0];

  const templateFolder = path.join(_srcRoot, _item.foldername);
  const result = await generateCopyJava(resourceRoot, templateFolder, undefined, path.join(gradleRoot, _item.gradlebase), toFolder,
                                        'frc.robot.Robot', path.join('frc', 'robot'), false, []);

  if (!result) {
    await dialog.showMessageBox({
      message: 'Cannot extract into non empty directory',
      noLink: true,
    });
    return;
  }

  const r = await dialog.showMessageBox({
    buttons: ['Open Folder', 'OK'],
    message: 'Creation of project complete',
    noLink: true,
  });
  if (r.response === 0) {
    console.log(toFolder);
    shell.showItemInFolder(path.join(toFolder, 'build.gradle'));
  }
  console.log(r);
}
