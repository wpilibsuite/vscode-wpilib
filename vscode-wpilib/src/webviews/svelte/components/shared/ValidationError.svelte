<script lang="ts">
  export let message: string | undefined = undefined;
  export let visible = false;
  export let id: string | undefined = undefined;
  export let className = 'project-error-text';
</script>

<div
  {id}
  class={className}
  aria-live="assertive"
  aria-hidden={!visible}
  style:display={visible ? 'block' : 'none'}
>
  <slot>
    {#if message}
      {message}
    {/if}
  </slot>
</div>

