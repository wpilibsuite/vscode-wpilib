<script lang="ts">
  import type { InstalledDependency } from './types';

  interface Props {
    dependencies: InstalledDependency[];
    onUpdate: (index: number, version: string) => void;
    onUninstall: (index: number) => void;
  }

  let { dependencies, onUpdate, onUninstall }: Props = $props();

  let selectedVersions: Record<string, string> = $state({});

  const versionFor = (dependency: InstalledDependency): string => {
    const selectedVersion = selectedVersions[dependency.uuid];
    return dependency.versionInfo.some((info) => info.version === selectedVersion)
      ? selectedVersion
      : dependency.currentVersion;
  };

  const isUpdateDisabled = (dependency: InstalledDependency, selectedVersion: string) =>
    dependency.versionInfo.findIndex((info) => info.version === selectedVersion) === 0 &&
    selectedVersion === dependency.currentVersion;
</script>

{#each dependencies as dependency, index (dependency.uuid)}
  {@const selectedVersion = versionFor(dependency)}
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
        <select
          value={selectedVersion}
          onchange={(event) => (selectedVersions[dependency.uuid] = event.currentTarget.value)}
        >
          {#each dependency.versionInfo as versionInfo (versionInfo.version)}
            <option>{versionInfo.version}</option>
          {/each}
        </select>
      </div>

      <button
        class="vscode-button"
        disabled={isUpdateDisabled(dependency, selectedVersion)}
        onclick={() => onUpdate(index, selectedVersion)}
      >
        {dependency.versionInfo.find((info) => info.version === selectedVersion)?.buttonText ??
          'Update'}
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
