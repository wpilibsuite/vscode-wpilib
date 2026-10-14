<script lang="ts">
  import { onMount } from 'svelte';
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

  const onHostMessage = (event: MessageEvent<DependencyMessage>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }
    if (message.type === 'updateDependencies') {
      installedDependencies = message.installed ?? [];
      availableDependencies = message.available ?? [];
    }
  };

  onMount(() => vscode.postMessage({ type: 'loaded' }));
</script>

<svelte:window onblur={() => vscode.postMessage({ type: 'blur' })} onmessage={onHostMessage} />

<div class="top-line">
  <button
    id="updateall-action"
    class="vscode-button block"
    disabled={installedDependencies.length === 0}
    onclick={() => vscode.postMessage({ type: 'updateall' })}
  >
    <i class="codicon codicon-sync"></i>
    <span>Update All Dependencies</span>
  </button>
</div>

<details class="vscode-collapsible">
  <summary>
    <i class="codicon codicon-chevron-right icon-arrow"></i>
    <h2 class="title">Install from URL</h2>
  </summary>
  <UrlInstallSection
    bind:url={urlInput}
    onInstall={(url) => vscode.postMessage({ type: 'installFromUrl', url })}
  />
</details>

<details class="vscode-collapsible always-show-actions" open>
  <summary>
    <i class="codicon codicon-chevron-right icon-arrow"></i>
    <h2 class="title">Installed Dependencies</h2>
    <div class="actions">
      <span class="vscode-badge counter">{installedDependencies.length}</span>
    </div>
  </summary>

  {#if installedDependencies.length === 0}
    <div class="empty-state">No dependencies installed</div>
  {:else}
    <InstalledDependencies
      dependencies={installedDependencies}
      onUpdate={(index, version) =>
        vscode.postMessage({ type: 'update', index: index.toString(), version })}
      onUninstall={(index) => vscode.postMessage({ type: 'uninstall', index })}
    />
  {/if}
</details>

<details class="vscode-collapsible always-show-actions" open>
  <summary>
    <i class="codicon codicon-chevron-right icon-arrow"></i>
    <h2 class="title">Available Dependencies</h2>
    <div class="actions">
      <span class="vscode-badge counter">{availableDependencies.length}</span>
    </div>
  </summary>
  {#if availableDependencies.length === 0}
    <div class="empty-state">No additional dependencies available</div>
  {:else}
    <AvailableDependencies
      dependencies={availableDependencies}
      onInstall={(index) => vscode.postMessage({ type: 'install', index })}
    />
  {/if}
</details>
