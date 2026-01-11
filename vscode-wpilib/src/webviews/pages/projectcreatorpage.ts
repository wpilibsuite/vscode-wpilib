'use strict';

import { getDesktopEnabled } from '../../utilities';
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
let currentStep = 1;
let languages: string[] = [];
let bases: string[] = [];

function navigateToStep(step: number) {
  // Hide all steps
  document.querySelectorAll('.wizard-step').forEach((el) => {
    (el as HTMLElement).classList.remove('active');
  });

  // Show the target step
  const targetStep = document.getElementById(`step-${step}`);
  if (targetStep) {
    targetStep.classList.add('active');
  }

  // Update progress indicators
  document.querySelectorAll('.progress-step').forEach((el) => {
    const stepNumber = parseInt((el as HTMLElement).getAttribute('data-step') || '0', 10);

    (el as HTMLElement).classList.remove('active', 'completed');

    if (stepNumber === step) {
      (el as HTMLElement).classList.add('active');
    } else if (stepNumber < step) {
      (el as HTMLElement).classList.add('completed');
    }
  });

  currentStep = step;

  // If navigating to step 2, ensure dropdowns reflect the current project type
  if (step === 2) {
    // Reset language dropdown to default state if needed
    const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    if (languageSelect.selectedIndex !== 0) {
      languageSelect.selectedIndex = 0;
      language = '';
    }

    // Reset base dropdown
    resetBaseDropdown();
  }

  // Update summary when navigating to the final step
  if (step === 4) {
    updateSummary();
  }
}

function updateSummary() {
  const typeEl = document.getElementById('summary-type');
  const languageEl = document.getElementById('summary-language');
  const baseEl = document.getElementById('summary-base');
  const locationEl = document.getElementById('summary-location');
  const teamEl = document.getElementById('summary-team');

  if (typeEl) {
    typeEl.textContent = ProjectType[projectType];
  }

  if (languageEl) {
    languageEl.textContent = language;
  }

  if (baseEl) {
    baseEl.textContent = base;
  }

  if (locationEl) {
    const projectFolder = (document.getElementById('projectFolder') as HTMLInputElement).value;
    const projectName = (document.getElementById('projectName') as HTMLInputElement).value;
    const newFolder = (document.getElementById('newFolderCB') as HTMLInputElement).checked;

    locationEl.textContent = newFolder ? `${projectFolder}/${projectName}` : projectFolder;
  }

  if (teamEl) {
    const teamNumber = (document.getElementById('teamNumber') as HTMLInputElement).value;
    teamEl.textContent = teamNumber ? teamNumber : 'Not specified';
  }
}

function validateCurrentStep(): boolean {
  switch (currentStep) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2();
    case 3:
      return validateStep3();
    case 4:
      return validateStep4();
    default:
      return true;
  }
}

function validateStep1(): boolean {
  return projectType !== undefined;
}

function validateStep2(): boolean {
  return language !== '' && base !== '';
}

function validateStep3(): boolean {
  const isValidProject = validateProject();
  const isValidFolder = validateProjectFolder();
  return isValidProject && isValidFolder;
}

function validateStep4(): boolean {
  return validateTeamNumber();
}

function resetBaseDropdown() {
  const baseSelect = document.getElementById('base-select') as HTMLSelectElement;

  // Clear all options except the first default option
  while (baseSelect.options.length > 1) {
    baseSelect.remove(1);
  }

  // Reset to default option and disable
  baseSelect.selectedIndex = 0;
  baseSelect.disabled = true;

  // Reset the base variable
  base = '';

  // Disable next button
  const nextButton = document.getElementById('next-to-step-3');
  if (nextButton) {
    (nextButton as HTMLButtonElement).disabled = true;
  }
}

function selectProjectType(type: ProjectType) {
  projectType = type;

  // Update selection visuals
  document.querySelectorAll('.selection-card').forEach((el) => {
    el.classList.remove('selected');
  });

  const selectedCard = document.querySelector(`.selection-card[data-value="${ProjectType[type]}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }

  // Enable next button
  const nextButton = document.getElementById('next-to-step-2');
  if (nextButton) {
    (nextButton as HTMLButtonElement).disabled = false;
  }

  // Reset language and base since they depend on project type
  language = '';
  base = '';

  // Request languages for this project type
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

function populateLanguageSelect(languages: string[]) {
  const select = document.getElementById('language-select') as HTMLSelectElement;

  // Clear existing options except the default
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Add new options
  languages.forEach((lang) => {
    const option = document.createElement('option');
    option.value = lang;
    option.textContent = lang;
    select.appendChild(option);
  });

  // Enable the select
  select.disabled = false;
}

function populateBaseSelect(bases: string[]) {
  const select = document.getElementById('base-select') as HTMLSelectElement;

  // Clear existing options except the default
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Add new options
  bases.forEach((baseOption) => {
    const option = document.createElement('option');
    option.value = baseOption;
    option.textContent = baseOption;
    select.appendChild(option);
  });

  // Enable the select
  select.disabled = false;
}

function selectProjectFolder() {
  (document.activeElement as HTMLElement).blur();
  vscode.postMessage({
    type: 'newproject',
    data: {
      base,
      desktop: false,
      language,
      newFolder: false,
      projectName: '',
      projectType,
      teamNumber: '',
      toFolder: (document.getElementById('projectFolder') as HTMLInputElement).value,
    },
  });
}

function generateProject() {
  if (!validateCurrentStep()) {
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

// Set up event handlers
function setupEventListeners() {
  // Step 1 - Project Type Selection
  document.querySelectorAll('.selection-card').forEach((el) => {
    el.addEventListener('click', () => {
      const typeValue = (el as HTMLElement).getAttribute('data-value');
      if (typeValue === 'Template') {
        selectProjectType(ProjectType.Template);
      } else if (typeValue === 'Example') {
        selectProjectType(ProjectType.Example);
      }
    });
  });

  document.getElementById('next-to-step-2')!.addEventListener('click', () => {
    if (validateStep1()) {
      navigateToStep(2);
    }
  });

  // Step 2 - Language and Base Selection
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
  languageSelect.addEventListener('change', () => {
    language = languageSelect.value;

    // Reset base dropdown when language changes
    resetBaseDropdown();

    // Request project bases for this language
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

    if (languageSelect.value !== 'CPP' && (document.getElementById('desktopCB') as HTMLInputElement).checked === true) {
      vscode.postMessage({
        data: { 
          base:'Error: Desktop Support can only be enabled for C++ projects! Please start again.',
          desktop: false,
          language,
          newFolder: false,
          projectName: '',
          projectType,
          teamNumber: '',
          toFolder: ''
        },
        type: ''
      });
      resetBaseDropdown();
    } else {
    validateStep2();
    }
  });

  const baseSelect = document.getElementById('base-select') as HTMLSelectElement;
  baseSelect.addEventListener('change', () => {
    base = baseSelect.value;

    // Enable next button if both selections are made
    const nextButton = document.getElementById('next-to-step-3');
    if (nextButton) {
      (nextButton as HTMLButtonElement).disabled = !validateStep2();
    }
  });

  document.getElementById('back-to-step-1')!.addEventListener('click', () => navigateToStep(1));
  document.getElementById('next-to-step-3')!.addEventListener('click', () => {
    if (validateStep2()) {
      navigateToStep(3);
    }
  });

  // Step 3 - Project Location and Name
  document.getElementById('projectSelectButton')!.addEventListener('click', selectProjectFolder);
  document.getElementById('projectName')!.addEventListener('input', () => {
    validateProject();
    // Update next button state
    const nextButton = document.getElementById('next-to-step-4');
    if (nextButton) {
      (nextButton as HTMLButtonElement).disabled = !validateStep3();
    }
  });
  document.getElementById('projectFolder')!.addEventListener('input', () => {
    validateProjectFolder();
    // Update next button state
    const nextButton = document.getElementById('next-to-step-4');
    if (nextButton) {
      (nextButton as HTMLButtonElement).disabled = !validateStep3();
    }
  });

  document.getElementById('back-to-step-2')!.addEventListener('click', () => navigateToStep(2));
  document.getElementById('next-to-step-4')!.addEventListener('click', () => {
    if (validateStep3()) {
      navigateToStep(4);
    }
  });

  // Step 4 - Review and Create
  document.getElementById('teamNumber')!.addEventListener('input', validateTeamNumber);
  document.getElementById('back-to-step-3')!.addEventListener('click', () => navigateToStep(3));
  document.getElementById('generateProject')!.addEventListener('click', generateProject);
}

window.addEventListener('message', (event) => {
  const data = event.data as IProjectIPCSend;
  const nextButton = document.getElementById('next-to-step-3') as HTMLButtonElement;

  switch (data.type) {
    case 'newproject':
      const elem = document.getElementById('projectFolder') as HTMLInputElement;
      elem.value = data.data as string;
      validateProjectFolder();
      // Update next button state
      const step3NextButton = document.getElementById('next-to-step-4');
      if (step3NextButton) {
        (step3NextButton as HTMLButtonElement).disabled = !validateStep3();
      }
      break;
    case 'projecttype':
      projectType = data.data as ProjectType;
      break;
    case 'language':
      const langData = data.data as string[];
      if (Array.isArray(langData)) {
        // This is a language list response
        languages = langData;
        populateLanguageSelect(languages);
      } else {
        // This is a language selection response
        language = data.data as string;
      }
      break;
    case 'base':
      const baseData = data.data as { label: string; description: string }[];
      if (Array.isArray(baseData)) {
        // This is a base list response
        bases = baseData.map((b) => b.label);
        populateBaseSelect(bases);
      } else {
        // This is a base selection response
        base = data.data as string;
        if (nextButton) {
          nextButton.disabled = !validateStep2();
        }
      }
      break;
    default:
      break;
  }
});

window.addEventListener('load', (_: Event) => {
  setupEventListeners();
  navigateToStep(1); // Start at first step
});
