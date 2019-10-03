'use strict';

import { IGradle2019IPCReceive, IGradle2019IPCSend } from './gradle2019importpagetypes';
import { validateTeamNumber } from './sharedpages';

interface IVsCodeApi {
  postMessage(message: IGradle2019IPCReceive): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

function gradle2019SelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'gradle2019' });
}

function projectSelectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({ type: 'newproject' });
}

function importProjectButtonClick() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    data: {
      desktop: (document.getElementById('desktopCB') as HTMLInputElement).checked,
      fromProps: (document.getElementById('gradle2019Input') as HTMLInputElement).value,
      newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
      projectName: (document.getElementById('projectName') as HTMLInputElement).value,
      teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    },
    type: 'importproject',
  });
}

window.addEventListener('message', (event) => {
  const data = event.data as IGradle2019IPCSend;
  switch (data.type) {
    case 'gradle2019':
      (document.getElementById('gradle2019Input') as HTMLInputElement).value = data.data;
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
  document.getElementById('gradle2019SelectButton')!.onclick = gradle2019SelectButtonClick;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('projectSelectButton')!.onclick = projectSelectButtonClick;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('teamNumber')!.oninput = validateTeamNumber;
  // tslint:disable-next-line:no-non-null-assertion
  document.getElementById('importProject')!.onclick = importProjectButtonClick;
});
