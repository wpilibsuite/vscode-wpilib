import { mount } from 'svelte';
import DependencyView from './DependencyView.svelte';

export default mount(DependencyView, { target: document.getElementById('app') ?? document.body });
