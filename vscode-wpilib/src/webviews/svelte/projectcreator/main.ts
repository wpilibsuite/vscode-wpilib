import { mount } from 'svelte';
import ProjectCreator from './ProjectCreator.svelte';

const target = document.getElementById('app') ?? document.body;

const app = mount(ProjectCreator, {
  target,
});

export default app;

