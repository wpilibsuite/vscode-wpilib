'use strict';

import { IGradle2020IPCReceive, IGradle2020IPCSend } from './gradle2020importpagetypes';
import { validateProject, validateTeamNumber } from './sharedpages';

interface IVsCodeApi {
  postMessage(message: IGradle2020IPCReceive): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

function gradle2020SelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'gradle2020' });
}

function projectSelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'newproject' });
}

function importProjectButtonClick() {
  const isValidTeam = validateTeamNumber();
  const isValidProject = validateProject();
  if (!isValidTeam || !isValidProject) {
    return;
  }

  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    data: {
      desktop: (document.getElementById('desktopCB') as HTMLInputElement).checked,
      fromProps: (document.getElementById('gradle2020Input') as HTMLInputElement).value,
      newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
      projectName: (document.getElementById('projectName') as HTMLInputElement).value,
      teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    },
    type: 'importproject',
  });
}

window.addEventListener('message', (event) => {
  const data = event.data as IGradle2020IPCSend;
  switch (data.type) {
    case 'gradle2020':
      (document.getElementById('gradle2020Input') as HTMLInputElement).value = data.data;
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
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('gradle2020SelectButton')!.onclick = gradle2020SelectButtonClick;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectSelectButton')!.onclick = projectSelectButtonClick;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectName')!.oninput = validateProject;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('teamNumber')!.oninput = validateTeamNumber;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('importProject')!.onclick = importProjectButtonClick;
});
