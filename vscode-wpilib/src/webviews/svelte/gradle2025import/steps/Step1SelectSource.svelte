<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  interface Props {
    sourcePath?: string;
  }

  let { sourcePath = '' }: Props = $props();

  const selectSource = () => dispatch('selectSource');
  const next = () => dispatch('next');

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

