<script lang="ts">
  import { onMount } from 'svelte';
  import { onWebviewMessage, postMessage, signalLoaded } from '../lib';
  import InstalledDependencies from './InstalledDependencies.svelte';
  import AvailableDependencies from './AvailableDependencies.svelte';
  import UrlInstallSection from './UrlInstallSection.svelte';
  import type { InstalledDependency, AvailableDependency } from './types';

  interface Props {
    mode?: string;
  }

  let { mode = 'ready' }: Props = $props();

  interface DependencyMessage {
    type: string;
    installed?: InstalledDependency[];
    available?: AvailableDependency[];
  }

  let installedDependencies: InstalledDependency[] = $state([]);
  let availableDependencies: AvailableDependency[] = $state([]);
  let urlInput = $state('');

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
    if (mode !== 'ready') {
      return;
    }

    const unsubscribe = onWebviewMessage<DependencyMessage>((message) => {
      if (message.type === 'updateDependencies') {
        installedDependencies = message.installed ?? [];
        availableDependencies = message.available ?? [];
      }
    });

    const blurListener = () => postMessage({ type: 'blur' });
    window.addEventListener('blur', blurListener);

    signalLoaded();

    return () => {
      unsubscribe();
      window.removeEventListener('blur', blurListener);
    };
  });
</script>

{#if mode === 'ready'}
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
{:else}
  <div class="error-content" style="max-width: 500px; margin: 48px auto; text-align: center;">
    <span class="codicon codicon-warning" style="font-size: 32px; display: block; margin-bottom: 16px;"></span>
    {#if mode === 'not-wpilib'}
      <b>This is not a WPILib project.</b><br />
      Vendor dependency management is only available for WPILib projects.<br />
      <br />
      To use vendor dependencies, open a WPILib project or create a new one from the WPILib extension.
    {:else if mode === 'no-workspace'}
      <b>No workspace is open.</b><br />
      Vendor dependency management is only available inside a workspace folder.<br />
      <br />
      Open a folder containing a WPILib project.
    {:else}
      <b>Vendor dependency view unavailable.</b>
    {/if}
  </div>
{/if}
