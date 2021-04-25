'use strict';

import { IEclipseIPCReceive, IEclipseIPCSend } from './eclipseimportpagetypes';
import { validateProject, validateTeamNumber } from './sharedpages';

interface IVsCodeApi {
  postMessage(message: IEclipseIPCReceive): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

function eclipseSelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'eclipse' });
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
      fromProps: (document.getElementById('eclipseInput') as HTMLInputElement).value,
      newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
      projectName: (document.getElementById('projectName') as HTMLInputElement).value,
      teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    },
    type: 'importproject',
  });
}

window.addEventListener('message', (event) => {
  const data = event.data as IEclipseIPCSend;
  switch (data.type) {
    case 'eclipse':
      (document.getElementById('eclipseInput') as HTMLInputElement).value = data.data;
      break;
    case 'projectname':
      const doc = document.getElementById('projectName') as HTMLInputElement;
      doc.value = data.data;
      doc.disabled = false;
      break;
    case 'newproject':
      const elem = document.getElementById('projectFolder') as HTMLInputElement;
      elem.value = data.data;
      break;
    default:
      break;
  }
});

window.addEventListener('load', (_: Event) => {
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('eclipseSelectButton')!.onclick = eclipseSelectButtonClick;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectSelectButton')!.onclick = projectSelectButtonClick;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('teamNumber')!.oninput = validateTeamNumber;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectName')!.oninput = validateProject;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('importProject')!.onclick = importProjectButtonClick;
});
