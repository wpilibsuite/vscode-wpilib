<script lang="ts">
  interface Props {
    active?: boolean;
    step?: number | string | undefined;
    element?: 'section' | 'div';
    ariaLabelledBy?: string | undefined;
    children?: import('svelte').Snippet;
  }

  let {
    active = false,
    step = undefined,
    element = 'div',
    ariaLabelledBy = undefined,
    children
  }: Props = $props();

  let classes = $derived(['wizard-step', active ? 'active' : ''].filter(Boolean).join(' '));
</script>

{#if element === 'section'}
  <section
    class={classes}
    data-step={step}
    aria-labelledby={ariaLabelledBy}
  >
    {@render children?.()}
  </section>
{:else}
  <div
    class={classes}
    data-step={step}
    aria-expanded={active}
    aria-labelledby={ariaLabelledBy}
  >
    {@render children?.()}
  </div>
{/if}

