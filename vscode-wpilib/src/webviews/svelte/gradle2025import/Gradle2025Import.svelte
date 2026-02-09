<script lang="ts">
  import { onMount } from 'svelte';
  import { WizardProgress, WizardStep } from '../components/shared';
  import Step1SelectSource from './steps/Step1SelectSource.svelte';
  import Step2Configure from './steps/Step2Configure.svelte';
  import Step3Review from './steps/Step3Review.svelte';
  import { getResourceBase, onWebviewMessage, postMessage, signalLoaded } from '../lib';
  import type { Gradle2025Message, Gradle2025ImportData } from './types';

  type WizardStepNumber = 1 | 2 | 3;
  type HardwareOption = 'none' | 'romi' | 'xrp';

  let logoPath = $state('');

  const steps = [
    { step: 1, label: 'Select Source' },
    { step: 2, label: 'Configure Project' },
    { step: 3, label: 'Review & Import' },
  ];

  let currentStep: WizardStepNumber = $state(1);
  let sourcePath = $state('');
  let projectFolder = $state('');
  let projectName = $state('');
  let teamNumber = $state('');
  let newFolder = $state(true);
  let desktop = $state(false);
  let hardware: HardwareOption = $state('none');

  let projectFolderError: string | null = $state(null);
  let projectNameError: string | null = $state(null);
  let teamNumberError: string | null = $state(null);

  let showProjectFolderError = $state(false);
  let showProjectNameError = $state(false);
  let showTeamNumberError = $state(false);

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
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isNaN(numeric) || numeric < 1 || numeric > 25599) {
      return 'Invalid Team Number';
    }
    return null;
  };

  const goToStep = (step: WizardStepNumber) => {
    currentStep = step;
  };

  const selectSourceProject = () => {
    postMessage({ type: 'gradle2025' });
  };

  const selectDestinationFolder = () => {
    postMessage({ type: 'newproject' });
  };

  const submitImport = () => {
    showProjectFolderError = true;
    showProjectNameError = true;
    showTeamNumberError = true;

    projectFolderError = validateProjectFolder(projectFolder);
    projectNameError = validateProjectName(projectName);
    teamNumberError = validateTeamNumber(teamNumber);

    if (projectFolderError || projectNameError || teamNumberError) {
      goToStep(2);
      return;
    }

    const payload: Gradle2025ImportData = {
      desktop,
      romi: hardware === 'romi',
      xrp: hardware === 'xrp',
      fromProps: sourcePath,
      newFolder,
      projectName,
      teamNumber,
      toFolder: projectFolder,
    };
    postMessage({ type: 'importproject', data: payload });
  };

  const destinationPath = $derived(
    newFolder && projectName
      ? `${projectFolder}/${projectName}`
      : projectFolder
  );

  onMount(() => {
    logoPath = `${getResourceBase()}/resources/wpilib-generic.svg`;

    const unsubscribe = onWebviewMessage<Gradle2025Message>((event) => {
      switch (event.type) {
        case 'gradle2025':
          sourcePath = event.data;
          break;
        case 'projectname':
          projectName = event.data;
          break;
        case 'newproject':
          projectFolder = event.data;
          break;
        case 'teamnumber':
          teamNumber = event.data;
          break;
        default:
          break;
      }
    });

    signalLoaded();

    return () => unsubscribe();
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
</script>

<div class="project-container">
  <img src={logoPath} alt="WPILib" height="75" />

  <h1 class="project-title">Import WPILib 2025 Project</h1>

  <WizardProgress {steps} currentStep={currentStep} />

  <WizardStep active={currentStep === 1} step={1}>
    <Step1SelectSource
      sourcePath={sourcePath}
      onSelectSource={selectSourceProject}
      onNext={() => goToStep(2)}
    />
  </WizardStep>

  <WizardStep active={currentStep === 2} step={2}>
    <Step2Configure
      {projectFolder}
      {projectName}
      {teamNumber}
      {newFolder}
      {desktop}
      projectFolderError={projectFolderError}
      projectNameError={projectNameError}
      teamNumberError={teamNumberError}
      {hardware}
      {showProjectFolderError}
      {showProjectNameError}
      {showTeamNumberError}
      onSelectFolder={selectDestinationFolder}
      onProjectNameChange={(value) => {
        projectName = value;
        showProjectNameError = true;
      }}
      onTeamNumberChange={(value) => {
        teamNumber = value;
        showTeamNumberError = true;
      }}
      onNewFolderChange={(value) => (newFolder = value)}
      onDesktopChange={(value) => (desktop = value)}
      onHardwareChange={(value) => (hardware = value)}
      onBack={() => goToStep(1)}
      onNext={() => {
        showProjectFolderError = true;
        showProjectNameError = true;
        showTeamNumberError = true;
        if (!projectFolderError && !projectNameError && !teamNumberError) {
          goToStep(3);
        }
      }}
    />
  </WizardStep>

  <WizardStep active={currentStep === 3} step={3}>
    <Step3Review
      sourcePath={sourcePath}
      destinationPath={destinationPath}
      teamNumber={teamNumber}
      onBack={() => goToStep(2)}
      onImport={submitImport}
    />
  </WizardStep>
</div>
