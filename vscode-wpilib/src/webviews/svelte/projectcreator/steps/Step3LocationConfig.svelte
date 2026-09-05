<script lang="ts">
  import ValidationError from '../../components/shared/ValidationError.svelte';
  import { createTranslator } from '../../lib/i18n';

  interface Props {
    projectFolder: string;
    projectFolderError: string | null;
    projectName: string;
    projectNameError: string | null;
    teamNumber: string;
    teamNumberError: string | null;
    newFolder: boolean;
    desktop: boolean;
    showProjectFolderError: boolean;
    showProjectNameError: boolean;
    showTeamNumberError: boolean;
    onSelectFolder: () => void;
    onProjectNameChange: (value: string) => void;
    onTeamNumberChange: (value: string) => void;
    onNewFolderChange: (value: boolean) => void;
    onDesktopChange: (value: boolean) => void;
    onBack: () => void;
    onNext: () => void;
  }

  let {
    projectFolder,
    projectFolderError,
    projectName,
    projectNameError,
    teamNumber,
    teamNumberError,
    newFolder,
    desktop,
    showProjectFolderError,
    showProjectNameError,
    showTeamNumberError,
    onSelectFolder,
    onProjectNameChange,
    onTeamNumberChange,
    onNewFolderChange,
    onDesktopChange,
    onBack,
    onNext,
  }: Props = $props();
  const t = createTranslator('projectcreator');

  let canProceed = $derived(!projectFolderError && !projectNameError);
</script>

<div class="step-header">
  <h2>{t('Step 3: Project Location & Configuration')}</h2>
  <p>{t('Set where to save your project and configure basic settings.')}</p>
</div>

<div class="project-row">
  <div id="projectfolderdiv" class="project-label"><b>{t('Base Folder')}</b></div>
  <div class="project-field-container">
    <input id="projectFolder" class="vscode-textfield" type="text" value={projectFolder} readonly />
    <ValidationError
      id="projectFolderError"
      message={projectFolderError ?? undefined}
      visible={showProjectFolderError && !!projectFolderError}
    />
  </div>
</div>

<div class="project-row">
  <button id="projectSelectButton" type="button" class="vscode-button" onclick={onSelectFolder}>
    {t('Select Folder')}
  </button>
</div>

<div class="project-row">
  <div id="projectnamediv" class="project-label"><b>{t('Project Name')}</b></div>
  <div class="project-field-container">
    <input
      id="projectName"
      class="vscode-textfield"
      type="text"
      value={projectName}
      oninput={(event) => onProjectNameChange(event.currentTarget?.value ?? projectName)}
    />
    <ValidationError
      id="projectNameError"
      message={projectNameError ?? undefined}
      visible={showProjectNameError && !!projectNameError}
    />
  </div>
</div>

<div class="project-row">
  <div class="project-label"><b>{t('Team Number')}</b></div>
  <div class="project-field-container">
    <input
      id="teamNumber"
      class="vscode-textfield"
      type="number"
      value={teamNumber}
      oninput={(event) => onTeamNumberChange(event.currentTarget?.value ?? teamNumber)}
    />
    <ValidationError
      id="teamNumberError"
      message={teamNumberError ?? undefined}
      visible={showTeamNumberError && !!teamNumberError}
    />
  </div>
</div>

<div class="project-row">
  <div class="vscode-checkbox">
    <input
      id="newFolderCB"
      type="checkbox"
      checked={newFolder}
      onchange={(event) => onNewFolderChange(event.currentTarget?.checked ?? newFolder)}
    />
    <label for="newFolderCB">
      <span class="icon">
        <i class="codicon codicon-check icon-checked"></i>
      </span>
      <span class="text">{t('Create a new folder')}</span>
    </label>
    <span class="checkbox-help">{t('Creates a new folder at Base Folder/Project Name')}</span>
  </div>
</div>

<div class="project-row">
  <div class="vscode-checkbox">
    <input
      id="desktopCB"
      type="checkbox"
      checked={desktop}
      onchange={(event) => onDesktopChange(event.currentTarget?.checked ?? desktop)}
    />
    <label for="desktopCB">
      <span class="icon">
        <i class="codicon codicon-check icon-checked"></i>
      </span>
      <span class="text">{t('Enable Desktop Support')}</span>
    </label>
    <span class="checkbox-help">{t('This enables unit testing and simulation support')}</span>
  </div>
</div>

<div class="wizard-navigation">
  <button id="back-to-step-2" type="button" class="vscode-button secondary" onclick={onBack}>
    {t('Back')}
  </button>
  <button
    id="next-to-step-4"
    type="button"
    class="vscode-button"
    disabled={!canProceed}
    onclick={onNext}
  >
    {t('Next')}
  </button>
</div>
