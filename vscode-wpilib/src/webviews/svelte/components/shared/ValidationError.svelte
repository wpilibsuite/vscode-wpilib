<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    message?: string;
    visible?: boolean;
    id?: string;
    className?: string;
    children?: Snippet;
  }

  let {
    message = undefined,
    visible = false,
    id = undefined,
    className = 'project-error-text',
    children,
  }: Props = $props();
</script>

<div
  {id}
  class={className}
  aria-live="assertive"
  aria-hidden={!visible}
  style:display={visible ? 'block' : 'none'}
>
  {#if children}{@render children()}{:else}
    {#if message}
      {message}
    {/if}
  {/if}
</div>
