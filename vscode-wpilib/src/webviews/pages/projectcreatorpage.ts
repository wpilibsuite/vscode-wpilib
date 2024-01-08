'use strict';

import { IProjectIPCReceive, IProjectIPCSend, ProjectType } from './projectcreatorpagetypes';
import { validateProject, validateTeamNumber, validateProjectFolder } from './sharedpages';

interface IVsCodeApi {
  postMessage(message: IProjectIPCReceive): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

let projectType: ProjectType = ProjectType.Template;
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
      desktop: false,
      language,
      newFolder: false,
      projectName: '',
      projectType,
      teamNumber: '',
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
      desktop: false,
      language,
      newFolder: false,
      projectName: '',
      projectType,
      teamNumber: '',
      toFolder: '',
    },
    type: 'base',
  });
}

function selectProjectFolder() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    type: 'newproject',
    data: {
      base: '',
      desktop: false,
      language,
      newFolder: false,
      projectName: '',
      projectType,
      teamNumber: '',
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    }
  });
}

function generateProject() {
  const isValidTeam = validateTeamNumber();
  const isValidProject = validateProject();
  const isValidFolder = validateProjectFolder();
  if (!isValidTeam || !isValidProject || !isValidFolder) {
    return;
  }

  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    data: {
      base,
      desktop: (document.getElementById('desktopCB') as HTMLInputElement).checked,
      language,
      newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
      projectName: (document.getElementById('projectName') as HTMLInputElement).value,
      projectType,
      teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
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
      validateProjectFolder();
      break;
    case 'projecttype':
      projectType = data.data as ProjectType;
      pType.innerText = ProjectType[projectType].toLowerCase();
      language = '';
      lang.disabled = false;
      lang.innerText = window.i18nTrans('projectcreator', 'Select a language');
      base = '';
      baseButton.style.visibility = 'initial';
      baseButton.disabled = true;
      baseButton.innerText = window.i18nTrans('projectcreator', 'Select a project base');
      selectLanguage();
      break;
    case 'language':
      language = data.data as string;
      lang.innerText = language;
      base = '';
      baseButton.disabled = false;
      baseButton.innerText = window.i18nTrans('projectcreator', 'Select a project base');
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
  document.getElementById('projectType')!.onclick = selectProjectType;
  document.getElementById('language')!.onclick = selectLanguage;
  document.getElementById('projectBase')!.onclick = selectProjectBase;
  document.getElementById('projectSelectButton')!.onclick = selectProjectFolder;
  document.getElementById('projectName')!.oninput = validateProject;
  document.getElementById('teamNumber')!.oninput = validateTeamNumber;
  document.getElementById('generateProject')!.onclick = generateProject;
  document.getElementById('projectFolder')!.onchange = validateProjectFolder;
});
