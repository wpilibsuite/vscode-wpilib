import { mount } from 'svelte';
import ProjectCreator from './ProjectCreator.svelte';

const target = document.getElementById('app') ?? document.body;

export default mount(ProjectCreator, {
  target,
});
