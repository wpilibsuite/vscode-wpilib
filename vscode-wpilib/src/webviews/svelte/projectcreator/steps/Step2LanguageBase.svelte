<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BaseOption } from '../types';

  const dispatch = createEventDispatcher();

  export let languages: string[] = [];
  export let selectedLanguage = '';
  export let bases: BaseOption[] = [];
  export let selectedBase = '';

  let languageValue = selectedLanguage;
  let baseValue = selectedBase;

  $: canProceed = languageValue !== '' && baseValue !== '';

  $: if (selectedLanguage !== languageValue) {
    languageValue = selectedLanguage;
  }

  $: if (selectedBase !== baseValue) {
    baseValue = selectedBase;
  }

  const notifyLanguageChange = () => {
    dispatch('languageChange', languageValue);
  };

  const notifyBaseChange = () => {
    dispatch('baseChange', baseValue);
  };

  const next = () => dispatch('next');
  const back = () => dispatch('back');
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
      <option value="" disabled selected={languageValue === ''}>Select a language</option>
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
      <option value="" disabled selected={baseValue === ''}>Select a project base</option>
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

