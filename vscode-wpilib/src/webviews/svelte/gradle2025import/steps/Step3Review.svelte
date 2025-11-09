<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { SummaryBox } from '../../components/shared';

  const dispatch = createEventDispatcher();

  export let sourcePath = '';
  export let destinationPath = '';
  export let teamNumber = '';

  const back = () => dispatch('back');
  const importProject = () => dispatch('import');
</script>

<div class="step-header">
  <h2>Step 3: Review &amp; Import</h2>
  <p>Review your settings and select additional options before importing.</p>
</div>

<div class="project-row">
  <SummaryBox
    items={[
      { label: 'Source Project', value: sourcePath || 'Not selected' },
      { label: 'Destination', value: destinationPath || 'Not selected' },
      { label: 'Team Number', value: teamNumber || 'Not specified' },
    ]}
  />
</div>

<div class="project-row">
  <div class="import-note">
    <p>
      <strong>Note:</strong> The import process copies your project source files to a new directory and
      completely regenerates the gradle files. If you made non-standard updates to the build.gradle,
      you'll need to make those changes again. Vendor libraries must also be imported again.
    </p>
    <p>
      For more details, see
      <a href="https://docs.wpilib.org/en/stable/docs/software/wpilib-overview/importing-gradle-project.html">
        Importing a Gradle Project
      </a>
      on frc-docs.
    </p>
  </div>
</div>

<div class="wizard-navigation">
  <button id="back-to-step-2" type="button" class="vscode-button secondary" on:click={back}>
    Back
  </button>
  <button id="importProject" type="button" class="vscode-button" on:click={importProject}>
    Import Project
  </button>
</div>

