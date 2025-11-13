import { mount } from 'svelte';
import DependencyView from './DependencyView.svelte';

const target = document.getElementById('app') ?? document.body;

const app = mount(DependencyView, {
  target,
});

export default app;

