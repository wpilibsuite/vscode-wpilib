import { mount } from 'svelte';
import RioLog from './RioLog.svelte';

export default mount(RioLog, { target: document.getElementById('app') ?? document.body });
