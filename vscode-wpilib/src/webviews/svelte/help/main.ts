import { mount } from 'svelte';
import Help from './Help.svelte';

const target = document.getElementById('app') ?? document.body;

const app = mount(Help, {
  target,
});

export default app;
