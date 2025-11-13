declare module '*.svelte' {
  import type { SvelteComponentTyped } from 'svelte';

  export default class Component<TProps = Record<string, unknown>, TEvents = Record<string, any>, TSlots = Record<string, any>> extends SvelteComponentTyped<TProps, TEvents, TSlots> {}
}

