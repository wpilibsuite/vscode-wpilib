'use strict';

import { validateProject, validateTeamNumber } from './sharedpages';

export interface IProjectIPCData {
  base: string;
  template: boolean;
  language: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

export interface IProjectIPCReceive {
  type: string;
  data?: IProjectIPCData;
}

export interface IProjectIPCSend {
  type: string;
  data: string | boolean;
}

interface IVsCodeApi {
  postMessage(message: IProjectIPCReceive): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

let template = false;
let language = '';
let base = '';

function selectProjectType() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'projecttype' });
}

function selectLanguage() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    data: {
      base: '',
      language,
      newFolder: false,
      projectName: '',
      teamNumber: '',
      template,
      toFolder: '',
    },
    type: 'language',
  });
}

function selectProjectBase() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    data: {
      base: '',
      language,
      newFolder: false,
      projectName: '',
      teamNumber: '',
      template,
      toFolder: '',
    },
    type: 'base',
  });
}

function selectProjectFolder() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'newproject' });
}

function generateProject() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    data: {
      base,
      language,
      newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
      projectName: (document.getElementById('projectName') as HTMLInputElement).value,
      teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
      template,
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    },
    type: 'createproject',
  });
}

window.addEventListener('message', (event) => {
  const data = event.data as IProjectIPCSend;
  const pType = document.getElementById('projectType') as HTMLInputElement;
  const lang = document.getElementById('language') as HTMLInputElement;
  const baseButton = document.getElementById('projectBase') as HTMLInputElement;
  switch (data.type) {
    case 'newproject':
      const elem = document.getElementById('projectFolder') as HTMLInputElement;
      elem.value = data.data as string;
      break;
    case 'projecttype':
      template = data.data as boolean;
      pType.innerText = template ? 'template' : 'example';
      lang.disabled = false;
      lang.innerText = 'Select a language';
      baseButton.disabled = true;
      baseButton.innerText = 'Select a project base';
      selectLanguage();
      break;
    case 'language':
      language = data.data as string;
      lang.innerText = language;
      baseButton.disabled = false;
      baseButton.innerText = 'Select a project base';
      selectProjectBase();
      break;
    case 'base':
      base = data.data as string;
      baseButton.innerText = base;
      break;
    default:
      break;
  }
});

window.addEventListener('load', (_: Event) => {
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectType')!.onclick = selectProjectType;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('language')!.onclick = selectLanguage;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectBase')!.onclick = selectProjectBase;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectSelectButton')!.onclick = selectProjectFolder;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectName')!.oninput = validateProject;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('teamNumber')!.oninput = validateTeamNumber;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('generateProject')!.onclick = generateProject;
});
