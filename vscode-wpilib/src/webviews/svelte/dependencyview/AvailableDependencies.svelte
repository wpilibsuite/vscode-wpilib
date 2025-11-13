<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { AvailableDependency } from './types';

  const dispatch = createEventDispatcher();

  interface Props {
    dependencies?: AvailableDependency[];
  }

  let { dependencies = [] }: Props = $props();
</script>

{#if dependencies.length === 0}
  <div class="empty-state">No additional dependencies available</div>
{:else}
  {#each dependencies as dependency, index}
    <div class="available-dependency">
      <div class="dependency-header">
        <span class="dependency-name">{dependency.name}</span>
        <button class="vscode-button" onclick={() => dispatch('install', { index })}>
          <i class="codicon codicon-add"></i>
          <span> Install</span>
        </button>
      </div>
      <div class="dependency-description">
        <span>{dependency.version}</span>
        <span> - {dependency.description}</span>
      </div>
    </div>
  {/each}
{/if}

