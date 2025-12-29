<script lang="ts">
  import type { InstalledDependency } from './types';

  interface Props {
    dependencies?: InstalledDependency[];
    onUpdate?: (index: number, version: string) => void;
    onUninstall?: (index: number) => void;
  }

  let { dependencies = [], onUpdate = () => {}, onUninstall = () => {} }: Props = $props();

  let selectedVersions: string[] = $state([]);

  $effect(() => {
    const nextSelected = dependencies.map((dep, index) => selectedVersions[index] ?? dep.currentVersion);
    if (
      nextSelected.length !== selectedVersions.length ||
      nextSelected.some((value, idx) => value !== selectedVersions[idx])
    ) {
      selectedVersions = nextSelected;
    }
  });

  const getButtonText = (dependency: InstalledDependency, selectedVersion: string) => {
    const entry = dependency.versionInfo.find((info) => info.version === selectedVersion);
    return entry?.buttonText ?? 'Update';
  };

  const isUpdateDisabled = (dependency: InstalledDependency, selectedVersion: string) => {
    const index = dependency.versionInfo.findIndex((info) => info.version === selectedVersion);
    return index === 0 && selectedVersion === dependency.currentVersion;
  };
</script>

{#if dependencies.length === 0}
  <div class="empty-state">No dependencies installed</div>
{:else}
  {#each dependencies as dependency, index}
    <div class="installed-dependency">
      <div class="dependency-header">
        <div class="dependency-title">
          <span class="dependency-name">{dependency.name}</span>
          <span class="dependency-version">{dependency.currentVersion}</span>
        </div>
      </div>

      <div class="dependency-controls">
        <div class="vscode-select" style="margin: 4px 0">
          <i class="codicon codicon-chevron-right chevron-icon"></i>
          <select bind:value={selectedVersions[index]}>
            {#each dependency.versionInfo as versionInfo}
              <option value={versionInfo.version}>
                {versionInfo.version}
              </option>
            {/each}
          </select>
        </div>

        <button
          class="vscode-button"
          disabled={isUpdateDisabled(dependency, selectedVersions[index])}
          onclick={() => onUpdate(index, selectedVersions[index])}
        >
          {getButtonText(dependency, selectedVersions[index])}
        </button>

        <button
          class="uninstall-button vscode-button"
          title={`Uninstall ${dependency.name}`}
          onclick={() => onUninstall(index)}
        >
          <i class="codicon codicon-trash"></i>
        </button>
      </div>
    </div>
  {/each}
{/if}
