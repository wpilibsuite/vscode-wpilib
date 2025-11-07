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

  const hardwareSelection = document.querySelector(
    'input[name="hardware"]:checked'
  ) as HTMLInputElement;
  const romiSelected = hardwareSelection?.value === 'romi';
  const xrpSelected = hardwareSelection?.value === 'xrp';

  vscode.postMessage({
    data: {
      desktop: (document.getElementById('desktopCB') as HTMLInputElement).checked,
      romi: romiSelected,
      xrp: xrpSelected,
      fromProps: (document.getElementById('gradle2025Input') as HTMLInputElement).value,
      newFolder: (document.getElementById('newFolderCB') as HTMLInputElement).checked,
      projectName: (document.getElementById('projectName') as HTMLInputElement).value,
      teamNumber: (document.getElementById('teamNumber') as HTMLInputElement).value,
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    },
    type: 'importproject',
  });
}

function navigateToStep(step: number) {
  document.querySelectorAll('.wizard-step').forEach((el) => {
    (el as HTMLElement).classList.remove('active');
  });

  const targetStep = document.getElementById(`step-${step}`);
  if (targetStep) {
    targetStep.classList.add('active');
  }

  document.querySelectorAll('.progress-step').forEach((el) => {
    const stepNumber = parseInt((el as HTMLElement).getAttribute('data-step') || '0', 10);

    (el as HTMLElement).classList.remove('active', 'completed');

    if (stepNumber === step) {
      (el as HTMLElement).classList.add('active');
    } else if (stepNumber < step) {
      (el as HTMLElement).classList.add('completed');
    }
  });

  if (step === 3) {
    updateSummary();
  }
}

function updateSummary() {
  const summarySource = document.getElementById('summary-source');
  const summaryDestination = document.getElementById('summary-destination');
  const summaryTeam = document.getElementById('summary-team');

  if (summarySource) {
    const gradle2025Input = document.getElementById('gradle2025Input') as HTMLInputElement;
    summarySource.textContent = gradle2025Input.value || 'Not selected';
  }

  if (summaryDestination) {
    const projectFolder = document.getElementById('projectFolder') as HTMLInputElement;
    const projectName = document.getElementById('projectName') as HTMLInputElement;
    const newFolder = document.getElementById('newFolderCB') as HTMLInputElement;

    let destination = projectFolder.value || 'Not selected';
    if (newFolder.checked && projectName.value) {
      destination += `/${projectName.value}`;
    }
    summaryDestination.textContent = destination;
  }

  if (summaryTeam) {
    const teamNumber = document.getElementById('teamNumber') as HTMLInputElement;
    summaryTeam.textContent = teamNumber.value || 'Not specified';
  }
}

window.addEventListener('message', (event) => {
  const data = event.data as IGradle2025IPCSend;
  switch (data.type) {
    case 'gradle2025':
      (document.getElementById('gradle2025Input') as HTMLInputElement).value = data.data;
      const nextButton = document.getElementById('next-to-step-2') as HTMLButtonElement;
      if (nextButton) {
        nextButton.disabled = false;
      }
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

  document.getElementById('next-to-step-2')!.onclick = () => navigateToStep(2);
  document.getElementById('next-to-step-3')!.onclick = () => navigateToStep(3);
  document.getElementById('back-to-step-1')!.onclick = () => navigateToStep(1);
  document.getElementById('back-to-step-2')!.onclick = () => navigateToStep(2);

  navigateToStep(1);

  vscode.postMessage({ type: 'loaded' });
});
