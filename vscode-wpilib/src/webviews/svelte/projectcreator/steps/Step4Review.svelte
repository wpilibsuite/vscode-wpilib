<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { SummaryBox } from '../../components/shared';
  import { ProjectType } from '../types';

  const dispatch = createEventDispatcher();

  export let projectType: ProjectType = ProjectType.Template;
  export let language = '';
  export let base = '';
  export let location = '';
  export let teamNumber = '';

  const back = () => dispatch('back');
  const createProject = () => dispatch('create');

  const projectTypeLabel = projectType === ProjectType.Template ? 'Template' : 'Example';
</script>

<div class="step-header">
  <h2>Step 4: Review &amp; Create</h2>
  <p>Review your selections and create the project.</p>
</div>

<div class="project-row">
  <SummaryBox
    items={[
      { label: 'Project Type', value: projectTypeLabel },
      { label: 'Language', value: language },
      { label: 'Project Base', value: base },
      { label: 'Location', value: location },
      { label: 'Team Number', value: teamNumber || 'Not specified' },
    ]}
  />
</div>

<div class="wizard-navigation">
  <button id="back-to-step-3" type="button" class="vscode-button secondary" on:click={back}>
    Back
  </button>
  <button id="generateProject" type="button" class="vscode-button" on:click={createProject}>
    Create Project
  </button>
</div>

