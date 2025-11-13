<script lang="ts">
  import type { BaseOption } from '../types';

  interface Props {
    languages?: string[];
    selectedLanguage?: string;
    bases?: BaseOption[];
    selectedBase?: string;
    onLanguageChange?: (language: string) => void;
    onBaseChange?: (base: string) => void;
    onNext?: () => void;
    onBack?: () => void;
  }

  let {
    languages = [],
    selectedLanguage = '',
    bases = [],
    selectedBase = '',
    onLanguageChange = () => {},
    onBaseChange = () => {},
    onNext = () => {},
    onBack = () => {}
  }: Props = $props();

  let languageValue = $state(selectedLanguage);
  let baseValue = $state(selectedBase);

  let previousSelectedLanguage = selectedLanguage;
  let previousSelectedBase = selectedBase;

  const canProceed = $derived(languageValue !== '' && baseValue !== '');

  $effect(() => {
    if (selectedLanguage !== previousSelectedLanguage) {
      previousSelectedLanguage = selectedLanguage;
      languageValue = selectedLanguage;
    }
  });

  $effect(() => {
    if (selectedBase !== previousSelectedBase) {
      previousSelectedBase = selectedBase;
      baseValue = selectedBase;
    }
  });


  const notifyLanguageChange = () => {
    onLanguageChange(languageValue);
  };

  const notifyBaseChange = () => {
    onBaseChange(baseValue);
  };

  const next = () => onNext();
  const back = () => onBack();
</script>

<div class="step-header">
  <h2>Step 2: Select Language &amp; Base</h2>
  <p>Choose the programming language and project base to use.</p>
</div>

<div class="project-row">
  <div class="project-label"><b>Language</b></div>
  <div class="select-wrapper vscode-select">
    <i class="codicon codicon-chevron-right chevron-icon"></i>
    <select
      id="language-select"
      class="project-select"
      bind:value={languageValue}
      on:change={notifyLanguageChange}
      disabled={languages.length === 0}
    >
  <option value="" disabled>Select a language</option>
      {#each languages as lang}
        <option value={lang}>{lang}</option>
      {/each}
    </select>
  </div>
</div>

<div class="project-row">
  <div class="project-label"><b>Project Base</b></div>
  <div class="select-wrapper vscode-select">
    <i class="codicon codicon-chevron-right chevron-icon"></i>
    <select
      id="base-select"
      class="project-select"
      bind:value={baseValue}
      on:change={notifyBaseChange}
      disabled={bases.length === 0}
    >
  <option value="" disabled>Select a project base</option>
      {#each bases as base}
        <option value={base.label}>{base.label}</option>
      {/each}
    </select>
  </div>
</div>

<div class="wizard-navigation">
  <button id="back-to-step-1" type="button" class="vscode-button secondary" on:click={back}>
    Back
  </button>
  <button
    id="next-to-step-3"
    type="button"
    class="vscode-button"
    disabled={!canProceed}
    on:click={next}
  >
    Next
  </button>
</div>

