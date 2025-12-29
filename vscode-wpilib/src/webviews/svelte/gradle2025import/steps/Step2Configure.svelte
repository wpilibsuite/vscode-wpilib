<script lang="ts">
  import { ValidationError } from '../../components/shared';

  type HardwareOption = 'none' | 'romi' | 'xrp';

  interface Props {
    projectFolder?: string;
    projectFolderError?: string | null;
    projectName?: string;
    projectNameError?: string | null;
    teamNumber?: string;
    teamNumberError?: string | null;
    newFolder?: boolean;
    desktop?: boolean;
    hardware?: HardwareOption;
    showProjectFolderError?: boolean;
    showProjectNameError?: boolean;
    showTeamNumberError?: boolean;
    onSelectFolder?: () => void;
    onProjectNameChange?: (value: string) => void;
    onTeamNumberChange?: (value: string) => void;
    onNewFolderChange?: (value: boolean) => void;
    onDesktopChange?: (value: boolean) => void;
    onHardwareChange?: (value: HardwareOption) => void;
    onBack?: () => void;
    onNext?: () => void;
  }

  let {
    projectFolder = '',
    projectFolderError = null,
    projectName = '',
    projectNameError = null,
    teamNumber = '',
    teamNumberError = null,
    newFolder = true,
    desktop = false,
    hardware = 'none',
    showProjectFolderError = false,
    showProjectNameError = false,
    showTeamNumberError = false,
    onSelectFolder = () => {},
    onProjectNameChange = () => {},
    onTeamNumberChange = () => {},
    onNewFolderChange = () => {},
    onDesktopChange = () => {},
    onHardwareChange = () => {},
    onBack = () => {},
    onNext = () => {}
  }: Props = $props();

  let canProceed = $derived(!projectFolderError && !projectNameError);

  const selectFolder = () => onSelectFolder();
  const back = () => onBack();
  const next = () => onNext();

  const updateHardware = (option: HardwareOption) => {
    onHardwareChange(option);
  };

  const handleProjectNameInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const inputValue = target?.value ?? projectName;
    onProjectNameChange(inputValue);
  };

  const handleTeamNumberInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const inputValue = target?.value ?? teamNumber;
    onTeamNumberChange(inputValue);
  };

  const handleNewFolderChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const checkedValue = target?.checked ?? newFolder;
    onNewFolderChange(checkedValue);
  };

  const handleDesktopChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const checkedValue = target?.checked ?? desktop;
    onDesktopChange(checkedValue);
  };
</script>

<div class="step-header">
  <h2>Step 2: Configure Project</h2>
  <p>Configure the new project's location and settings.</p>
</div>

<div class="project-row">
  <div id="projectfolderdiv" class="project-label"><b>Base Folder</b></div>
  <span>Select a base folder to place the new project into.</span>
</div>

<div class="project-row">
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
  <button id="projectSelectButton" type="button" class="vscode-button" onclick={selectFolder}>
    Select Base Folder
  </button>
</div>

<div class="project-row">
  <div class="project-label"><b>Project Name</b></div>
  <div class="project-field-container">
    <input
      id="projectName"
      class="vscode-textfield"
      type="text"
      value={projectName}
      oninput={handleProjectNameInput}
    />
    <ValidationError
      id="projectNameError"
      message={projectNameError ?? undefined}
      visible={showProjectNameError && !!projectNameError}
    />
  </div>
</div>

<div class="project-row">
  <div class="project-label"><b>Team Number</b></div>
  <div class="project-field-container">
    <input
      id="teamNumber"
      class="vscode-textfield"
      type="number"
      value={teamNumber}
      oninput={handleTeamNumberInput}
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
      onchange={handleNewFolderChange}
    />
    <label for="newFolderCB">
      <span class="icon">
        <i class="codicon codicon-check icon-checked"></i>
      </span>
      <span class="text">Create a new folder</span>
    </label>
    <span class="checkbox-help">Creates a new folder at Base Folder/Project Name</span>
  </div>
</div>

<div class="project-row">
  <div class="vscode-checkbox">
    <input
      id="desktopCB"
      type="checkbox"
      checked={desktop}
      onchange={handleDesktopChange}
    />
    <label for="desktopCB">
      <span class="icon">
        <i class="codicon codicon-check icon-checked"></i>
      </span>
      <span class="text">Enable Desktop Support</span>
    </label>
    <span class="checkbox-help">Enables desktop simulation and unit testing</span>
  </div>
</div>

<div class="project-row">
  <h3>Hardware Platform</h3>
  <p>Select a hardware platform if applicable:</p>
  <div class="radio-option">
    <input
      id="noneCB"
      type="radio"
      name="hardware"
      value="none"
      checked={hardware === 'none'}
      onchange={() => updateHardware('none')}
    />
    <label for="noneCB">SystemCore</label>
  </div>
  <div class="radio-option">
    <input
      id="romiCB"
      type="radio"
      name="hardware"
      value="romi"
      checked={hardware === 'romi'}
      onchange={() => updateHardware('romi')}
    />
    <label for="romiCB">Romi</label>
  </div>
  <div class="radio-option">
    <input
      id="xrpCB"
      type="radio"
      name="hardware"
      value="xrp"
      checked={hardware === 'xrp'}
      onchange={() => updateHardware('xrp')}
    />
    <label for="xrpCB">XRP</label>
  </div>
</div>

<div class="wizard-navigation">
  <button id="back-to-step-1" type="button" class="vscode-button secondary" onclick={back}>
    Back
  </button>
  <button
    id="next-to-step-3"
    type="button"
    class="vscode-button"
    disabled={!canProceed}
    onclick={next}
  >
    Next
  </button>
</div>
