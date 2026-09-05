<script lang="ts">
  import WizardProgress from '../components/shared/WizardProgress.svelte';
  import WizardStep from '../components/shared/WizardStep.svelte';
  import Step1ProjectType from './steps/Step1ProjectType.svelte';
  import Step2LanguageBase from './steps/Step2LanguageBase.svelte';
  import Step3LocationConfig from './steps/Step3LocationConfig.svelte';
  import Step4Review from './steps/Step4Review.svelte';
  import { createTranslator } from '../lib/i18n';
  import { getResourceBase } from '../lib/webview-context';
  import {
    ProjectType,
    type BaseOption,
    type ProjectCreationData,
  } from './types';

  const vscode = acquireVsCodeApi();
  const t = createTranslator('projectcreator');
  const logoPath = `${getResourceBase()}/resources/wpilib-generic.svg`;

  interface WizardStepConfig {
    step: number;
    label: string;
  }

  type ProjectWizardStep = 1 | 2 | 3 | 4;

  const steps: WizardStepConfig[] = [
    { step: 1, label: t('Project Type') },
    { step: 2, label: t('Project Settings') },
    { step: 3, label: t('Location & Config') },
    { step: 4, label: t('Review & Create') },
  ];

  let currentStep: ProjectWizardStep = $state(1);
  let projectType: ProjectType | null = $state(null);
  let languages: string[] = $state([]);
  let selectedLanguage = $state('');
  let bases: BaseOption[] = $state([]);
  let selectedBase = $state('');
  let projectFolder = $state('');
  let projectName = $state('');
  let teamNumber = $state('');
  let newFolder = $state(true);
  let desktop = $state(false);

  let showProjectFolderError = $state(false);
  let showProjectNameError = $state(false);
  let showTeamNumberError = $state(false);

  const goToStep = (step: ProjectWizardStep) => {
    currentStep = step;
  };

  const requestLanguageList = (type: ProjectType) => {
    const payload: ProjectCreationData = {
      base: '',
      desktop: false,
      language: '',
      newFolder: false,
      projectName: '',
      projectType: type,
      teamNumber: '',
      toFolder: '',
    };
    vscode.postMessage({ type: 'language', data: payload });
  };

  const requestBaseList = (type: ProjectType, language: string) => {
    const payload: ProjectCreationData = {
      base: '',
      desktop: false,
      language,
      newFolder: false,
      projectName: '',
      projectType: type,
      teamNumber: '',
      toFolder: '',
    };
    vscode.postMessage({ type: 'base', data: payload });
  };

  const validateProjectName = (value: string): string | null => {
    if (value.trim() === '') {
      return t('Project name is required');
    }
    return null;
  };

  const validateProjectFolder = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return t('Base folder is required');
    }
    if (trimmed.includes('OneDrive')) {
      return t("Invalid Base Folder - Folder can't be in OneDrive");
    }
    return null;
  };

  const validateTeamNumber = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    if (!/^\d+$/.test(trimmed)) {
      return t('Invalid Team Number');
    }
    const numberValue = Number.parseInt(trimmed, 10);
    if (Number.isNaN(numberValue) || numberValue < 1 || numberValue > 25599) {
      return t('Invalid Team Number');
    }
    return null;
  };

  const handleProjectTypeSelection = (type: ProjectType) => {
    projectType = type;
    languages = [];
    selectedLanguage = '';
    bases = [];
    selectedBase = '';
    requestLanguageList(type);
  };

  const handleStep1Next = () => {
    if (projectType !== null) {
      goToStep(2);
    }
  };

  const handleLanguageChange = (language: string) => {
    selectedLanguage = language;
    selectedBase = '';
    bases = [];
    if (projectType !== null) {
      requestBaseList(projectType, language);
    }
  };

  const handleBaseChange = (base: string) => {
    selectedBase = base;
  };

  const handleProjectNameChange = (name: string) => {
    projectName = name;
    showProjectNameError = true;
  };

  const handleTeamNumberChange = (value: string) => {
    teamNumber = value;
    showTeamNumberError = true;
  };

  const handleProjectFolderUpdate = (folder: string) => {
    projectFolder = folder;
    showProjectFolderError = true;
  };

  const selectProjectFolder = () => {
    const payload: ProjectCreationData = {
      base: selectedBase,
      desktop,
      language: selectedLanguage,
      newFolder,
      projectName,
      projectType: projectType ?? ProjectType.Template,
      teamNumber,
      toFolder: projectFolder,
    };
    vscode.postMessage({ type: 'newproject', data: payload });
  };

  const handleStep3Next = () => {
    showProjectFolderError = true;
    showProjectNameError = true;
    showTeamNumberError = true;
    if (!projectFolderError && !projectNameError && !teamNumberError) {
      goToStep(4);
    }
  };

  const createProject = () => {
    if (projectType === null) {
      return;
    }
    const payload: ProjectCreationData = {
      base: selectedBase,
      desktop,
      language: selectedLanguage,
      newFolder,
      projectName,
      projectType,
      teamNumber,
      toFolder: projectFolder,
    };
    vscode.postMessage({ type: 'createproject', data: payload });
  };

  const onHostMessage = (event: MessageEvent<{ type?: string; data?: unknown }>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }
    switch (message.type) {
      case 'newproject': {
        if (typeof message.data === 'string') {
          handleProjectFolderUpdate(message.data);
        }
        break;
      }
      case 'projecttype': {
        if (typeof message.data === 'number') {
          projectType = message.data as ProjectType;
        }
        break;
      }
      case 'language': {
        if (Array.isArray(message.data)) {
          languages = message.data as string[];
        } else if (typeof message.data === 'string') {
          selectedLanguage = message.data;
        }
        break;
      }
      case 'base': {
        if (Array.isArray(message.data)) {
          bases = message.data as BaseOption[];
        } else if (typeof message.data === 'string') {
          selectedBase = message.data;
        }
        break;
      }
      default:
        break;
    }
  };

  const projectFolderError = $derived(validateProjectFolder(projectFolder));
  const projectNameError = $derived(validateProjectName(projectName));
  const teamNumberError = $derived(validateTeamNumber(teamNumber));

  const summaryLocation = $derived(
    newFolder && projectName
      ? `${projectFolder}/${projectName}`
      : projectFolder
  );
</script>

<svelte:window onmessage={onHostMessage} />

<div class="project-container">
  <img src={logoPath} alt="WPILib" height="75" />

  <h1 class="project-title">{t('Welcome to WPILib New Project Creator')}</h1>

  <WizardProgress {steps} currentStep={currentStep} />

  <WizardStep active={currentStep === 1} step={1}>
    <Step1ProjectType
      selected={projectType}
      onSelect={handleProjectTypeSelection}
      onNext={handleStep1Next}
    />
  </WizardStep>

  <WizardStep active={currentStep === 2} step={2}>
    <Step2LanguageBase
      {languages}
      {bases}
      selectedLanguage={selectedLanguage}
      selectedBase={selectedBase}
      onLanguageChange={handleLanguageChange}
      onBaseChange={handleBaseChange}
      onNext={() => goToStep(3)}
      onBack={() => goToStep(1)}
    />
  </WizardStep>

  <WizardStep active={currentStep === 3} step={3}>
    <Step3LocationConfig
      {projectFolder}
      {projectName}
      {teamNumber}
      {newFolder}
      {desktop}
      {projectFolderError}
      {projectNameError}
      {teamNumberError}
      showProjectFolderError={showProjectFolderError}
      showProjectNameError={showProjectNameError}
      showTeamNumberError={showTeamNumberError}
      onSelectFolder={selectProjectFolder}
      onProjectNameChange={handleProjectNameChange}
      onTeamNumberChange={handleTeamNumberChange}
      onNewFolderChange={(value) => (newFolder = value)}
      onDesktopChange={(value) => (desktop = value)}
      onBack={() => goToStep(2)}
      onNext={handleStep3Next}
    />
  </WizardStep>

  <WizardStep active={currentStep === 4} step={4}>
    <Step4Review
      projectType={projectType ?? ProjectType.Template}
      language={selectedLanguage}
      base={selectedBase}
      location={summaryLocation}
      teamNumber={teamNumber}
      onBack={() => goToStep(3)}
      onCreate={createProject}
    />
  </WizardStep>
</div>
