<script lang="ts">
  import { onMount } from 'svelte';
  import { WizardProgress, WizardStep } from '../components/shared';
  import Step1ProjectType from './steps/Step1ProjectType.svelte';
  import Step2LanguageBase from './steps/Step2LanguageBase.svelte';
  import Step3LocationConfig from './steps/Step3LocationConfig.svelte';
  import Step4Review from './steps/Step4Review.svelte';
  import { getResourceBase, onWebviewMessage, postMessage } from '../lib';
  import {
    ProjectType,
    type BaseOption,
    type ProjectCreationData,
  } from './types';

  let logoPath = $state('');

  interface WizardStepConfig {
    step: number;
    label: string;
  }

  type ProjectWizardStep = 1 | 2 | 3 | 4;

  const steps: WizardStepConfig[] = [
    { step: 1, label: 'Project Type' },
    { step: 2, label: 'Project Settings' },
    { step: 3, label: 'Location & Config' },
    { step: 4, label: 'Review & Create' },
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

  let projectFolderError: string | null = $state(null);
  let projectNameError: string | null = $state(null);
  let teamNumberError: string | null = $state(null);

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
    postMessage({ type: 'language', data: payload });
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
    postMessage({ type: 'base', data: payload });
  };

  const validateProjectName = (value: string): string | null => {
    if (value.trim() === '') {
      return 'Project name is required';
    }
    return null;
  };

  const validateProjectFolder = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return 'Base folder is required';
    }
    if (trimmed.includes('OneDrive')) {
      return "Invalid Base Folder - Folder can't be in OneDrive";
    }
    return null;
  };

  const validateTeamNumber = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    if (!/^\d+$/.test(trimmed)) {
      return 'Invalid Team Number';
    }
    const numberValue = Number.parseInt(trimmed, 10);
    if (Number.isNaN(numberValue) || numberValue < 1 || numberValue > 25599) {
      return 'Invalid Team Number';
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
    postMessage({ type: 'newproject', data: payload });
  };

  const handleStep3Next = () => {
    showProjectFolderError = true;
    showProjectNameError = true;
    showTeamNumberError = true;
    projectFolderError = validateProjectFolder(projectFolder);
    projectNameError = validateProjectName(projectName);
    teamNumberError = validateTeamNumber(teamNumber);
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
    postMessage({ type: 'createproject', data: payload });
  };

  onMount(() => {
    logoPath = `${getResourceBase()}/resources/wpilib-generic.svg`;

    const unsubscribe = onWebviewMessage<{ type: string; data: unknown }>((event) => {
      switch (event.type) {
        case 'newproject': {
          if (typeof event.data === 'string') {
            handleProjectFolderUpdate(event.data);
          }
          break;
        }
        case 'projecttype': {
          if (typeof event.data === 'number') {
            projectType = event.data as ProjectType;
          }
          break;
        }
        case 'language': {
          if (Array.isArray(event.data)) {
            languages = event.data as string[];
          } else if (typeof event.data === 'string') {
            selectedLanguage = event.data;
          }
          break;
        }
        case 'base': {
          if (Array.isArray(event.data)) {
            bases = event.data as BaseOption[];
          } else if (typeof event.data === 'string') {
            selectedBase = event.data;
          }
          break;
        }
        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  });

  $effect(() => {
    projectFolderError = validateProjectFolder(projectFolder);
  });
  $effect(() => {
    projectNameError = validateProjectName(projectName);
  });
  $effect(() => {
    teamNumberError = validateTeamNumber(teamNumber);
  });

  const summaryLocation = $derived(
    newFolder && projectName
      ? `${projectFolder}/${projectName}`
      : projectFolder
  );
</script>

<div class="project-container">
  <img src={logoPath} alt="WPILib" height="75" />

  <h1 class="project-title">Welcome to WPILib New Project Creator</h1>

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
