<script lang="ts">
  import { onMount } from 'svelte';
  import { onWebviewMessage } from '../lib';
  import InstalledDependencies from './InstalledDependencies.svelte';
  import AvailableDependencies from './AvailableDependencies.svelte';
  import UrlInstallSection from './UrlInstallSection.svelte';
  import type { InstalledDependency, AvailableDependency } from './types';

  const vscode = acquireVsCodeApi();

  interface DependencyMessage {
    type: string;
    installed?: InstalledDependency[];
    available?: AvailableDependency[];
  }

  let installedDependencies: InstalledDependency[] = $state([]);
  let availableDependencies: AvailableDependency[] = $state([]);
  let urlInput = $state('');

  const updateAll = () => {
    vscode.postMessage({ type: 'updateall' });
  };

  const installFromUrl = (url: string) => {
    vscode.postMessage({ type: 'installFromUrl', url });
  };

  const installDependency = (index: number) => {
    vscode.postMessage({ type: 'install', index });
  };

  const uninstallDependency = (index: number) => {
    vscode.postMessage({ type: 'uninstall', index });
  };

  const updateDependency = (index: number, version: string) => {
    vscode.postMessage({ type: 'update', index: index.toString(), version });
  };

  onMount(() => {
    const unsubscribe = onWebviewMessage<DependencyMessage>((message) => {
      if (message.type === 'updateDependencies') {
        installedDependencies = message.installed ?? [];
        availableDependencies = message.available ?? [];
      }
    });

    const blurListener = () => vscode.postMessage({ type: 'blur' });
    window.addEventListener('blur', blurListener);

    vscode.postMessage({ type: 'loaded' });

    return () => {
      unsubscribe();
      window.removeEventListener('blur', blurListener);
    };
  });
</script>

<div class="top-line">
  <button id="updateall-action" class="vscode-button block" disabled={installedDependencies.length === 0} onclick={updateAll}>
    <i class="codicon codicon-sync"></i>
    <span>Update All Dependencies</span>
  </button>
</div>

<details class="vscode-collapsible">
  <summary>
    <i class="codicon codicon-chevron-right icon-arrow"></i>
    <h2 class="title">Install from URL</h2>
  </summary>
  <UrlInstallSection bind:url={urlInput} onInstall={installFromUrl} />
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
    onUpdate={updateDependency}
    onUninstall={uninstallDependency}
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
    onInstall={installDependency}
  />
</details>
