import { mount } from 'svelte';
import DependencyView from './DependencyView.svelte';

const target = document.getElementById('app') ?? document.body;

export default mount(DependencyView, {
  target,
});
