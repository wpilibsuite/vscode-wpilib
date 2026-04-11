import { mount } from 'svelte';
import DependencyView from './DependencyView.svelte';
import { getViewMode } from '../lib';

const target = document.getElementById('app') ?? document.body;

export default mount(DependencyView, {
  target,
  props: {
    mode: getViewMode(),
  },
});
