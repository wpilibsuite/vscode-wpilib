declare module '*.svelte' {
  import type { SvelteComponentTyped } from 'svelte';

  export default class Component<
    TProps extends Record<string, any> = Record<string, any>,
    TEvents extends Record<string, any> = Record<string, any>,
    TSlots extends Record<string, any> = Record<string, any>,
  > extends SvelteComponentTyped<TProps, TEvents, TSlots> {}
}
