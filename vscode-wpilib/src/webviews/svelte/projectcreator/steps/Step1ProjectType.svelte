<script lang="ts">
  import { createTranslator } from '../../lib/i18n';
  import { ProjectType } from '../types';

  interface Props {
    selected: ProjectType | null;
    onSelect: (type: ProjectType) => void;
    onNext: () => void;
  }

  let { selected, onSelect, onNext }: Props = $props();
  const t = createTranslator('projectcreator');
</script>

<div class="step-header">
  <h2>{t('Step 1: Select Project Type')}</h2>
  <p>{t('Choose whether to create a project from a template or an example.')}</p>
</div>

<div class="selection-cards">
  <button
    type="button"
    class={['selection-card', selected === ProjectType.Template && 'selected']}
    data-value="Template"
    onclick={() => onSelect(ProjectType.Template)}
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
    class={['selection-card', selected === ProjectType.Example && 'selected']}
    data-value="Example"
    onclick={() => onSelect(ProjectType.Example)}
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
    onclick={onNext}
  >
    {t('Next')}
  </button>
</div>
