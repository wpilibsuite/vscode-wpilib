<script lang="ts">
  interface Props {
    sourcePath?: string;
    onSelectSource?: () => void;
    onNext?: () => void;
  }

  let { sourcePath = '', onSelectSource = () => {}, onNext = () => {} }: Props = $props();

  const selectSource = () => onSelectSource();
  const next = () => onNext();

  let canProceed = $derived(sourcePath.trim().length > 0);
</script>

<div class="step-header">
  <h2>Step 1: Select Source Project</h2>
  <p>Select the build.gradle file of your 2025 WPILib project that you want to import.</p>
</div>

<div class="project-row">
  <div class="project-label"><b>Gradle Project</b></div>
  <span>Select the build.gradle file of the gradle project to import.</span>
</div>

<div class="project-row">
  <input id="gradle2025Input" class="vscode-textfield" type="text" value={sourcePath} readonly />
</div>

<div class="project-row">
  <button id="gradle2025SelectButton" type="button" class="vscode-button" onclick={selectSource}>
    Select Source Project
  </button>
</div>

<div class="wizard-navigation">
  <div></div>
  <button
    id="next-to-step-2"
    type="button"
    class="vscode-button"
    disabled={!canProceed}
    onclick={next}
  >
    Next
  </button>
</div>
