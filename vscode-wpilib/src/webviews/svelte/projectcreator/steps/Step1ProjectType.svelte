<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ProjectType } from '../types';

  const dispatch = createEventDispatcher();

  interface Props {
    selected?: ProjectType | null;
  }

  let { selected = null }: Props = $props();

  const select = (type: ProjectType) => {
    dispatch('select', type);
  };

  const next = () => dispatch('next');
</script>

<div class="step-header">
  <h2>Step 1: Select Project Type</h2>
  <p>Choose whether to create a project from a template or an example.</p>
</div>

<div class="selection-cards">
  <button
    type="button"
    class:selected={selected === ProjectType.Template}
    class="selection-card"
    data-value="Template"
    onclick={() => select(ProjectType.Template)}
    aria-pressed={selected === ProjectType.Template}
  >
    <h3>Template</h3>
    <p>Start with a basic robot program structure</p>
    <div class="card-icon">
      <i class="codicon codicon-notebook-template"></i>
    </div>
  </button>
  <button
    type="button"
    class:selected={selected === ProjectType.Example}
    class="selection-card"
    data-value="Example"
    onclick={() => select(ProjectType.Example)}
    aria-pressed={selected === ProjectType.Example}
  >
    <h3>Example</h3>
    <p>Start with a complete example project</p>
    <div class="card-icon">
      <i class="codicon codicon-notebook"></i>
    </div>
  </button>
</div>

<div class="wizard-navigation">
  <div></div>
  <button
    id="next-to-step-2"
    type="button"
    class="vscode-button"
    disabled={selected === null}
    onclick={next}
  >
    Next
  </button>
</div>

