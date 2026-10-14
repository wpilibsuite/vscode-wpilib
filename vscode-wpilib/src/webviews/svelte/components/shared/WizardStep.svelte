<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    active?: boolean;
    step?: number | string;
    element?: 'section' | 'div';
    ariaLabelledBy?: string;
    children?: Snippet;
  }

  let {
    active = false,
    step = undefined,
    element = 'div',
    ariaLabelledBy = undefined,
    children,
  }: Props = $props();
</script>

{#if element === 'section'}
  <section
    class={['wizard-step', active && 'active']}
    data-step={step}
    aria-labelledby={ariaLabelledBy}
  >
    {@render children?.()}
  </section>
{:else}
  <div
    class={['wizard-step', active && 'active']}
    data-step={step}
    aria-expanded={active}
    aria-labelledby={ariaLabelledBy}
  >
    {@render children?.()}
  </div>
{/if}
