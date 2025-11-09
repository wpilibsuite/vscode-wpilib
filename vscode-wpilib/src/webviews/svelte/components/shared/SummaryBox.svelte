<script lang="ts" context="module">
  export interface SummaryItem {
    label: string;
    value?: string | number | null;
  }
</script>

<script lang="ts">
  export let title: string | undefined = undefined;
  export let items: SummaryItem[] = [];
</script>

<div class="summary-box">
  {#if title}
    <h3>{title}</h3>
  {/if}

  <slot>
    {#each items as item (item.label)}
      <div class="summary-row">
        <strong>{item.label}:</strong>
        <span>{item.value ?? ''}</span>
      </div>
    {/each}
  </slot>
</div>

