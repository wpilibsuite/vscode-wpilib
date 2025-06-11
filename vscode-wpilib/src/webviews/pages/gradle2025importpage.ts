'use strict';

import { IGradle2025IPCReceive, IGradle2025IPCSend } from './gradle2025importpagetypes';
import {
  validateProject,
  validateTeamNumber,
  validateProjectFolder,
  validateXrpRomi,
} from './sharedpages';

interface IVsCodeApi {
  postMessage(message: IGradle2025IPCReceive): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

function gradle2025SelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'gradle2025' });
}

function projectSelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'newproject' });
}

function importProjectButtonClick() {
  const isValidTeam = validateTeamNumber();
  const isValidProject = validateProject();
  const isValidFolder = validateProjectFolder();
  const isXrpRomiValid = validateXrpRomi();
  if (!isValidTeam || !isValidProject || !isValidFolder || !isXrpRomiValid) {
    return;
  }

  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    data: {
      desktop: (document.getElementById('desktopCB') as HTMLInputElement).checked,
      romi: (document.getElementById('romiCB') as HTMLInputElement).checked,
      xrp: (document.getElementById('xrpCB') as HTMLInputElement).checked,
      fromProps: (document.getElementById('gradle2025Input') as HTMLInputElement).value,
      newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
      projectName: (document.getElementById('projectName') as HTMLInputElement).value,
      teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    },
    type: 'importproject',
  });
}

window.addEventListener('message', (event) => {
  const data = event.data as IGradle2025IPCSend;
  switch (data.type) {
    case 'gradle2025':
      (document.getElementById('gradle2025Input') as HTMLInputElement).value = data.data;
      break;
    case 'projectname':
      const doc = document.getElementById('projectName') as HTMLInputElement;
      doc.value = data.data;
      doc.disabled = false;
      validateProject();
      break;
    case 'newproject':
      const elem = document.getElementById('projectFolder') as HTMLInputElement;
      elem.value = data.data;
      validateProjectFolder();
      break;
    case 'teamnumber':
      const tn = document.getElementById('teamNumber') as HTMLInputElement;
      tn.value = data.data;
      validateTeamNumber();
      break;
    default:
      break;
  }
});

window.addEventListener('load', (_: Event) => {
  document.getElementById('gradle2025SelectButton')!.onclick = gradle2025SelectButtonClick;
  document.getElementById('projectSelectButton')!.onclick = projectSelectButtonClick;
  document.getElementById('projectName')!.oninput = validateProject;
  document.getElementById('teamNumber')!.oninput = validateTeamNumber;
  document.getElementById('importProject')!.onclick = importProjectButtonClick;
  document.getElementById('projectFolder')!.oninput = validateProjectFolder;
  document.getElementById('romiCB')!.onchange = validateXrpRomi;
  document.getElementById('xrpCB')!.onchange = validateXrpRomi;

  vscode.postMessage({ type: 'loaded' });
});
