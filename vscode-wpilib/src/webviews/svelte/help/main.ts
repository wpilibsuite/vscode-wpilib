import { mount } from 'svelte';
import Help from './Help.svelte';

export default mount(Help, { target: document.getElementById('app') ?? document.body });
