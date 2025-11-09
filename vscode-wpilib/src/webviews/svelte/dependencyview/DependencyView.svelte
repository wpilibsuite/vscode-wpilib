<script lang="ts">
  import { onMount } from 'svelte';
  import { postMessage, subscribeToMessages } from '../lib';
  import InstalledDependencies from './InstalledDependencies.svelte';
  import AvailableDependencies from './AvailableDependencies.svelte';
  import UrlInstallSection from './UrlInstallSection.svelte';
  import type { InstalledDependency, AvailableDependency } from './types';

  interface DependencyMessage {
    type: string;
    installed?: InstalledDependency[];
    available?: AvailableDependency[];
  }

  let installedDependencies: InstalledDependency[] = [];
  let availableDependencies: AvailableDependency[] = [];
  let urlInput = '';

  const updateAll = () => {
    postMessage({ type: 'updateall' });
  };

  const installFromUrl = (url: string) => {
    postMessage({ type: 'installFromUrl', url });
  };

  const installDependency = (index: number) => {
    postMessage({ type: 'install', index });
  };

  const uninstallDependency = (index: number) => {
    postMessage({ type: 'uninstall', index });
  };

  const updateDependency = (index: number, version: string) => {
    postMessage({ type: 'update', index: index.toString(), version });
  };

  onMount(() => {
    const unsubscribe = subscribeToMessages<DependencyMessage>((message) => {
      if (message.type === 'updateDependencies') {
        installedDependencies = message.installed ?? [];
        availableDependencies = message.available ?? [];
      }
    });

    const blurListener = () => postMessage({ type: 'blur' });
    window.addEventListener('blur', blurListener);

    postMessage({ type: 'loaded' });

    return () => {
      unsubscribe();
      window.removeEventListener('blur', blurListener);
    };
  });
</script>

<div class="top-line">
  <button id="updateall-action" class="vscode-button block" disabled={installedDependencies.length === 0} on:click={updateAll}>
    <i class="codicon codicon-sync"></i>
    <span>Update All Dependencies</span>
  </button>
</div>

<details class="vscode-collapsible">
  <summary>
    <i class="codicon codicon-chevron-right icon-arrow"></i>
    <h2 class="title">Install from URL</h2>
  </summary>
  <UrlInstallSection bind:url={urlInput} on:install={(event) => installFromUrl(event.detail)} />
</details>

<details class="vscode-collapsible always-show-actions" open>
  <summary>
    <i class="codicon codicon-chevron-right icon-arrow"></i>
    <h2 class="title">Installed Dependencies</h2>
    <div class="actions">
      <span class="vscode-badge counter">{installedDependencies.length}</span>
    </div>
  </summary>
  <InstalledDependencies
    dependencies={installedDependencies}
    on:update={(event) => updateDependency(event.detail.index, event.detail.version)}
    on:uninstall={(event) => uninstallDependency(event.detail.index)}
  />
</details>

<details class="vscode-collapsible always-show-actions" open>
  <summary>
    <i class="codicon codicon-chevron-right icon-arrow"></i>
    <h2 class="title">Available Dependencies</h2>
    <div class="actions">
      <span class="vscode-badge counter">{availableDependencies.length}</span>
    </div>
  </summary>
  <AvailableDependencies
    dependencies={availableDependencies}
    on:install={(event) => installDependency(event.detail.index)}
  />
</details>

