import * as electron from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { generateCopyCpp, generateCopyJava } from './shared/generator';

const remote = electron.remote;
const dialog = remote.dialog;
const app = remote.app;
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
  const javaRadio = document.createElement('input');
  javaRadio.type = 'radio';
  javaRadio.id = 'javaRadio';
  javaRadio.name = 'language';
  javaRadio.value = 'java';
  javaRadio.checked = true;
  const javaRadioLabel = document.createElement('label');
  javaRadioLabel.htmlFor = 'javaRadio';
  javaRadioLabel.innerText = 'Java Templates';

  const javaRadioExamples = document.createElement('input');
  javaRadioExamples.type = 'radio';
  javaRadioExamples.id = 'javaRadioExamples';
  javaRadioExamples.name = 'language';
  javaRadioExamples.value = 'javaex';
  const javaRadioLabelExamples = document.createElement('label');
  javaRadioLabelExamples.htmlFor = 'javaRadioExamples';
  javaRadioLabelExamples.innerText = 'Java Examples';

  const cppRadio = document.createElement('input');
  cppRadio.type = 'radio';
  cppRadio.id = 'cppRadio';
  cppRadio.name = 'language';
  cppRadio.value = 'cpp';
  const cppRadioLabel = document.createElement('label');
  cppRadioLabel.htmlFor = 'cppRadio';
  cppRadioLabel.innerText = 'C++ Templates';

  const cppRadioExamples = document.createElement('input');
  cppRadioExamples.type = 'radio';
  cppRadioExamples.id = 'cppRadioExamples';
  cppRadioExamples.name = 'language';
  cppRadioExamples.value = 'cppex';
  const cppRadioLabelExamples = document.createElement('label');
  cppRadioLabelExamples.htmlFor = 'cppRadioExamples';
  cppRadioLabelExamples.innerText = 'C++ Examples';

  radioForm.appendChild(javaRadio);
  radioForm.appendChild(javaRadioLabel);
  radioForm.appendChild(javaRadioExamples);
  radioForm.appendChild(javaRadioLabelExamples);
  radioForm.appendChild(cppRadio);
  radioForm.appendChild(cppRadioLabel);
  radioForm.appendChild(cppRadioExamples);
  radioForm.appendChild(cppRadioLabelExamples);

  async function eventCheck(_ev: MouseEvent) {
    if (javaRadio.checked) {
      await handleJavaTemplates();
    } else if (javaRadioExamples.checked) {
      await handleJavaExamples();
    } else if (cppRadio.checked) {
      await handleCppTemplates();
    } else if (cppRadioExamples.checked) {
      await handleCppExamples();
    } else {
      console.log('hmm, invalid click');
    }
  }

  javaRadio.addEventListener('click', eventCheck);
  javaRadioExamples.addEventListener('click', eventCheck);
  cppRadio.addEventListener('click', eventCheck);
  cppRadioExamples.addEventListener('click', eventCheck);

  mainDiv.appendChild(radioForm);

  const itemsDiv = document.createElement('div');
  itemsDiv.id = 'shownItems';
  mainDiv.appendChild(itemsDiv);

  await handleJavaTemplates();

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
  if (e.which === 123) {
    remote.getCurrentWindow().webContents.toggleDevTools();
  } else if (e.which === 116) {
    location.reload();
  }
});

function askForFolder(): Promise<string[]> {
  return new Promise<string[]>((resolve) => {
    dialog.showOpenDialog({
      defaultPath: projectRootPath,
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
    }, (paths) => {
      resolve(paths);
    });
  });
}

async function handleCppCreate(_item: IDisplayJSON, _srcRoot: string): Promise<void> {
  const dirArr = await askForFolder();
  if (dirArr === undefined) {
    return;
  }
  const toFolder = dirArr[0];

  const templateFolder = path.join(_srcRoot, _item.foldername);
  const result = await generateCopyCpp(templateFolder, path.join(gradleRoot, _item.gradlebase), toFolder);
  if (!result) {
    dialog.showMessageBox({
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
  const result = await generateCopyJava(templateFolder, path.join(gradleRoot, _item.gradlebase), toFolder);

  if (!result) {
    dialog.showMessageBox({
      message: 'Cannot extract into non empty directory',
      noLink: true,
    });
    return;
  }

  dialog.showMessageBox({
    buttons: ['Open Folder', 'OK'],
    message: 'Creation of project complete',
    noLink: true,
  }, (r) => {
    if (r === 0) {
      console.log(toFolder);
      shell.showItemInFolder(path.join(toFolder, 'build.gradle'));
    }
    console.log(r);
  });
}
