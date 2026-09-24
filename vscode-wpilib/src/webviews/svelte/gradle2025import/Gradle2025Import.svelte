<script lang="ts">
  import { onMount } from 'svelte';
  import WizardProgress from '../components/shared/WizardProgress.svelte';
  import WizardStep from '../components/shared/WizardStep.svelte';
  import Step1SelectSource from './steps/Step1SelectSource.svelte';
  import Step2Configure from './steps/Step2Configure.svelte';
  import Step3Review from './steps/Step3Review.svelte';
  import { getResourceBase } from '../lib/webview-context';
  import type { Gradle2025Message, Gradle2025ImportData } from './types';

  const vscode = acquireVsCodeApi();
  const logoPath = `${getResourceBase()}/resources/wpilib-generic.svg`;

  type WizardStepNumber = 1 | 2 | 3;
  type HardwareOption = 'none' | 'romi' | 'xrp';

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

  const goToStep = (step: WizardStepNumber) => (currentStep = step);

  const selectSourceProject = () => vscode.postMessage({ type: 'gradle2025' });

  const selectDestinationFolder = () => vscode.postMessage({ type: 'newproject' });

  const submitImport = () => {
    showProjectFolderError = true;
    showProjectNameError = true;
    showTeamNumberError = true;

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
    vscode.postMessage({ type: 'importproject', data: payload });
  };

  const destinationPath = $derived(
    newFolder && projectName ? `${projectFolder}/${projectName}` : projectFolder
  );

  const projectFolderError = $derived(validateProjectFolder(projectFolder));
  const projectNameError = $derived(validateProjectName(projectName));
  const teamNumberError = $derived(validateTeamNumber(teamNumber));

  const onHostMessage = (event: MessageEvent<Gradle2025Message>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }
    switch (message.type) {
      case 'gradle2025':
        sourcePath = message.data;
        break;
      case 'projectname':
        projectName = message.data;
        break;
      case 'newproject':
        projectFolder = message.data;
        break;
      case 'teamnumber':
        teamNumber = message.data;
        break;
      default:
        break;
    }
  };

  onMount(() => vscode.postMessage({ type: 'loaded' }));
</script>

<svelte:window onmessage={onHostMessage} />

<div class="project-container">
  <img src={logoPath} alt="WPILib" height="75" />

  <h1 class="project-title">Import WPILib 2025-2026 Project</h1>

  <WizardProgress {steps} {currentStep} />

  <WizardStep active={currentStep === 1} step={1}>
    <Step1SelectSource
      {sourcePath}
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
      {projectFolderError}
      {projectNameError}
      {teamNumberError}
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
      {sourcePath}
      {destinationPath}
      {teamNumber}
      onBack={() => goToStep(2)}
      onImport={submitImport}
    />
  </WizardStep>
</div>
