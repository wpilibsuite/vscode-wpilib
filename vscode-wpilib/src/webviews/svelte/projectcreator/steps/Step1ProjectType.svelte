<script lang="ts">
  import { createTranslator } from '../../lib';
  import { ProjectType } from '../types';

  interface Props {
    selected: ProjectType | null;
    onSelect: (type: ProjectType) => void;
    onNext: () => void;
  }

  let { selected = null, onSelect = () => {}, onNext = () => {} }: Props = $props();
  const t = createTranslator('projectcreator');

  const select = (type: ProjectType) => {
    onSelect(type);
  };

  const next = () => onNext();
</script>

<div class="step-header">
  <h2>{t('Step 1: Select Project Type')}</h2>
  <p>{t('Choose whether to create a project from a template or an example.')}</p>
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
    <h3>{t('Template')}</h3>
    <p>{t('Start with a basic robot program structure')}</p>
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
    <h3>{t('Example')}</h3>
    <p>{t('Start with a complete example project')}</p>
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
    {t('Next')}
  </button>
</div>
