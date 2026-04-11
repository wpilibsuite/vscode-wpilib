import { mount } from 'svelte';
import Help from './Help.svelte';

const target = document.getElementById('app') ?? document.body;

export default mount(Help, {
  target,
});
