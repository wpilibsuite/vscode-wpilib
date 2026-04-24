<script lang="ts">
  import { createTranslator } from '../../lib';
  import type { BaseOption } from '../types';

  interface Props {
    languages: string[];
    selectedLanguage: string;
    bases: BaseOption[];
    selectedBase: string;
    onLanguageChange: (language: string) => void;
    onBaseChange: (base: string) => void;
    onNext: () => void;
    onBack: () => void;
  }

  let {
    languages = [],
    selectedLanguage = '',
    bases = [],
    selectedBase = '',
    onLanguageChange = () => {},
    onBaseChange = () => {},
    onNext = () => {},
    onBack = () => {},
  }: Props = $props();
  const t = createTranslator('projectcreator');

  const canProceed = $derived(selectedLanguage !== '' && selectedBase !== '');

  const notifyLanguageChange = (event: Event) => {
    onLanguageChange((event.currentTarget as HTMLSelectElement).value);
  };

  const notifyBaseChange = (event: Event) => {
    onBaseChange((event.currentTarget as HTMLSelectElement).value);
  };

  const next = () => onNext();
  const back = () => onBack();
</script>

<div class="step-header">
  <h2>{t('Step 2: Select Language & Base')}</h2>
  <p>{t('Choose the programming language and project base to use.')}</p>
</div>

<div class="project-row">
  <div class="project-label"><b>{t('Language')}</b></div>
  <div class="select-wrapper vscode-select">
    <i class="codicon codicon-chevron-right chevron-icon"></i>
    <select
      id="language-select"
      class="project-select"
      value={selectedLanguage}
      onchange={notifyLanguageChange}
      disabled={languages.length === 0}
    >
      <option value="" disabled>{t('Select a language')}</option>
      {#each languages as lang}
        <option value={lang}>{lang}</option>
      {/each}
    </select>
  </div>
</div>

<div class="project-row">
  <div class="project-label"><b>{t('Project Base')}</b></div>
  <div class="select-wrapper vscode-select">
    <i class="codicon codicon-chevron-right chevron-icon"></i>
    <select
      id="base-select"
      class="project-select"
      value={selectedBase}
      onchange={notifyBaseChange}
      disabled={bases.length === 0}
    >
      <option value="" disabled>{t('Select a project base')}</option>
      {#each bases as base}
        <option value={base.label}>{base.label}</option>
      {/each}
    </select>
  </div>
</div>

<div class="wizard-navigation">
  <button id="back-to-step-1" type="button" class="vscode-button secondary" onclick={back}>
    {t('Back')}
  </button>
  <button
    id="next-to-step-3"
    type="button"
    class="vscode-button"
    disabled={!canProceed}
    onclick={next}
  >
    {t('Next')}
  </button>
</div>
