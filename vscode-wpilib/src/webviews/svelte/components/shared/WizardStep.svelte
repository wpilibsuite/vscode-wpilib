<script lang="ts">
  export let active = false;
  export let step: number | string | undefined = undefined;
  export let element: 'section' | 'div' = 'div';
  export let ariaLabelledBy: string | undefined = undefined;

  $: classes = ['wizard-step', active ? 'active' : ''].filter(Boolean).join(' ');
</script>

{#if element === 'section'}
  <section
    class={classes}
    data-step={step}
    aria-labelledby={ariaLabelledBy}
  >
    <slot />
  </section>
{:else}
  <div
    class={classes}
    data-step={step}
    aria-expanded={active}
    aria-labelledby={ariaLabelledBy}
  >
    <slot />
  </div>
{/if}

