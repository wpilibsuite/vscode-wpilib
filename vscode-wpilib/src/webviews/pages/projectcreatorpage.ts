'use strict';

import {
  IBaseOption,
  IProjectIPCReceive,
  IProjectIPCSend,
  ISnippetOption,
  ProjectType,
} from './projectcreatorpagetypes';
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
let bases: IBaseOption[] = [];
let snippets: IBaseOption[] = [];
let snippetsLanguage = '';
let snippetRequestId = 0;
let exampleContent: 'examples' | 'snippets' = 'examples';
const selectedTags = new Set<string>();

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

  // Ensure a language chip remains selected when returning to step 2.
  if (step === 2) {
    renderLanguageOptions();
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
  bases = [];
  selectedTags.clear();
  renderExampleCatalog();

  // Disable next button
  const nextButton = document.getElementById('next-to-step-3');
  if (nextButton) {
    (nextButton as HTMLButtonElement).disabled = true;
  }
}

function selectProjectType(type: ProjectType) {
  projectType = type;

  const exampleCatalog = document.getElementById('example-catalog') as HTMLElement;
  const baseSelectRow = document.getElementById('base-select-row') as HTMLElement;
  exampleCatalog.hidden = type !== ProjectType.Example;
  baseSelectRow.hidden = type === ProjectType.Example;

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
  renderLanguageOptions();
  resetBaseDropdown();
  base = '';
  snippets = [];
  snippetsLanguage = '';
  snippetRequestId++;

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

function renderLanguageOptions() {
  const container = document.getElementById('language-options');
  if (!container) {
    return;
  }

  container.replaceChildren();
  languages.forEach((lang) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `example-kind-button language-chip${language === lang ? ' active' : ''}`;
    button.textContent = lang;
    button.setAttribute('aria-pressed', String(language === lang));
    button.addEventListener('click', () => selectLanguage(lang));
    container.appendChild(button);
  });
}

function selectLanguage(selectedLanguage: string) {
  language = selectedLanguage;
  snippets = [];
  snippetsLanguage = '';
  selectedTags.clear();
  resetBaseDropdown();
  renderLanguageOptions();

  if (exampleContent === 'snippets') {
    requestSnippets();
  }

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

function populateBaseSelect(options: IBaseOption[]) {
  const select = document.getElementById('base-select') as HTMLSelectElement;

  // Clear existing options except the default
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Add new options
  options.forEach((baseOption) => {
    const option = document.createElement('option');
    option.value = baseOption.label;
    option.textContent = baseOption.label;
    select.appendChild(option);
  });

  // Enable the select
  select.disabled = false;
  bases = options;
  selectedTags.clear();
  renderExampleCatalog();
}

function createExampleButton(option: IBaseOption, isSnippet: boolean): HTMLButtonElement {
  const selectionBase = isSnippet ? `${option.label} (Snippet)` : option.label;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `example-card${base === selectionBase ? ' selected' : ''}`;
  button.setAttribute('aria-pressed', String(base === selectionBase));

  const title = document.createElement('span');
  title.className = 'example-card-title';
  title.textContent = option.label;
  button.appendChild(title);

  if (option.description) {
    const description = document.createElement('span');
    description.className = 'example-card-description';
    description.textContent = option.description;
    button.appendChild(description);
  }

  const tags = document.createElement('span');
  tags.className = 'example-card-tags';
  option.tags.forEach((tag) => {
    const badge = document.createElement('span');
    badge.className = 'example-tag';
    badge.textContent = tag;
    tags.appendChild(badge);
  });
  button.appendChild(tags);

  button.addEventListener('click', () => {
    base = base === selectionBase ? '' : selectionBase;
    const select = document.getElementById('base-select') as HTMLSelectElement;
    select.value = base;
    updateBaseSelection();
    renderExampleCatalog();
  });
  return button;
}

function updateBaseSelection() {
  const nextButton = document.getElementById('next-to-step-3') as HTMLButtonElement;
  nextButton.disabled = !validateStep2();
}

function renderExampleList(container: HTMLElement, options: IBaseOption[], isSnippet: boolean) {
  container.replaceChildren();
  options.forEach((option) => container.appendChild(createExampleButton(option, isSnippet)));

  if (options.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'example-empty';
    empty.textContent = isSnippet
      ? 'No snippets match this selection. Try different tags.'
      : 'No examples match this selection. Try different tags or search terms.';
    container.appendChild(empty);
  }
}

function requestSnippets() {
  if (!language || snippetsLanguage === language) {
    return;
  }

  snippets = [];
  snippetsLanguage = language;
  const requestId = ++snippetRequestId;
  vscode.postMessage({
    type: 'snippets',
    requestId,
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
  });
}

function renderExampleCatalog() {
  const isSnippet = exampleContent === 'snippets';
  const options = isSnippet ? snippets : bases;
  const selectedTagsArray = Array.from(selectedTags);
  const filtered = options.filter((option) =>
    selectedTagsArray.every((tag) => option.tags.includes(tag))
  );
  const tags = Array.from(new Set(options.flatMap((option) => option.tags))).sort((a, b) =>
    a.localeCompare(b)
  );
  const count = document.getElementById('example-count');
  if (count) {
    const itemLabel = exampleContent === 'examples' ? 'example' : 'snippet';
    count.textContent = `${filtered.length} ${filtered.length === 1 ? itemLabel : `${itemLabel}s`}`;
  }

  const cloud = document.getElementById('example-tags');
  if (cloud) {
    cloud.replaceChildren();
    tags.forEach((tag) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `example-tag-chip${selectedTags.has(tag) ? ' active' : ''}`;
      const tagLabel = document.createElement('span');
      tagLabel.className = 'example-tag-label';
      tagLabel.textContent = tag;
      tagLabel.title = tag;
      const tagCount = document.createElement('span');
      tagCount.className = 'example-tag-count';
      const otherSelectedTags = selectedTagsArray.filter((selectedTag) => selectedTag !== tag);
      tagCount.textContent = String(
        options.filter(
          (option) =>
            option.tags.includes(tag) &&
            otherSelectedTags.every((selectedTag) => option.tags.includes(selectedTag))
        ).length
      );
      button.append(tagLabel, tagCount);
      button.setAttribute('aria-pressed', String(selectedTags.has(tag)));
      button.addEventListener('click', () => {
        if (selectedTags.has(tag)) {
          selectedTags.delete(tag);
        } else {
          selectedTags.add(tag);
        }
        renderExampleCatalog();
      });
      cloud.appendChild(button);
    });
    renderExampleList(document.getElementById('example-results')!, filtered, isSnippet);
  }
}

function setExampleContent(content: 'examples' | 'snippets') {
  if (exampleContent !== content) {
    selectedTags.clear();
    if (base.endsWith(' (Snippet)')) {
      base = '';
      (document.getElementById('base-select') as HTMLSelectElement).value = '';
      updateBaseSelection();
    }
  }
  exampleContent = content;
  const isExamples = content === 'examples';
  const examplesButton = document.getElementById('show-examples') as HTMLButtonElement;
  const snippetsButton = document.getElementById('show-snippets') as HTMLButtonElement;
  const description = document.getElementById('example-description');
  const hint = document.getElementById('example-hint');

  examplesButton.classList.toggle('active', isExamples);
  examplesButton.setAttribute('aria-pressed', String(isExamples));
  snippetsButton.classList.toggle('active', !isExamples);
  snippetsButton.setAttribute('aria-pressed', String(!isExamples));

  if (description) {
    description.textContent = isExamples
      ? 'Select one or more tags to filter examples. Choose an example to continue.'
      : 'Select one or more tags to filter snippets. Choose a snippet to continue.';
  }
  if (hint) {
    hint.textContent = isExamples
      ? 'Results must match every selected tag. Clear all tags to show every example.'
      : 'Results must match every selected tag. Clear all tags to show every snippet.';
  }

  if (!isExamples) {
    requestSnippets();
  }
  renderExampleCatalog();
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
  const baseSelect = document.getElementById('base-select') as HTMLSelectElement;
  baseSelect.addEventListener('change', () => {
    base = baseSelect.value;
    updateBaseSelection();
  });

  document.getElementById('show-examples')!.addEventListener('click', () => {
    setExampleContent('examples');
  });
  document.getElementById('show-snippets')!.addEventListener('click', () => {
    setExampleContent('snippets');
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
        renderLanguageOptions();
      } else {
        // This is a language selection response
        language = data.data as string;
      }
      break;
    case 'base':
      const baseData = data.data as IBaseOption[];
      if (Array.isArray(baseData)) {
        // This is a base list response
        populateBaseSelect(baseData);
        updateBaseSelection();
      } else {
        // This is a base selection response
        base = data.data as string;
        if (nextButton) {
          nextButton.disabled = !validateStep2();
        }
      }
      break;
    case 'snippets':
      if (data.requestId !== snippetRequestId) {
        break;
      }
      snippets = (data.data as ISnippetOption[]).map((snippet) => ({
        label: snippet.name,
        description: snippet.description,
        tags: snippet.tags ?? [],
      }));
      renderExampleCatalog();
      break;
    default:
      break;
  }
});

window.addEventListener('load', (_: Event) => {
  setupEventListeners();
  setExampleContent(exampleContent);
  navigateToStep(1); // Start at first step
});
