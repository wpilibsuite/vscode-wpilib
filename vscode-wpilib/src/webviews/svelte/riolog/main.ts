import { mount } from 'svelte';
import RioLog from './RioLog.svelte';

const target = document.getElementById('app') ?? document.body;

const app = mount(RioLog, {
  target,
});

export default app;
