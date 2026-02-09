<script lang="ts" module>
  export interface SummaryItem {
    label: string;
    value?: string | number | null;
  }
</script>

<script lang="ts">
  interface Props {
    title?: string | undefined;
    items?: SummaryItem[];
    children?: import('svelte').Snippet;
  }

  let { title = undefined, items = [], children }: Props = $props();
</script>

<div class="summary-box">
  {#if title}
    <h3>{title}</h3>
  {/if}

  {#if children}{@render children()}{:else}
    {#each items as item (item.label)}
      <div class="summary-row">
        <strong>{item.label}:</strong>
        <span>{item.value ?? ''}</span>
      </div>
    {/each}
  {/if}
</div>

