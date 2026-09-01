import { mount } from 'svelte';
import ProjectCreator from './ProjectCreator.svelte';

export default mount(ProjectCreator, { target: document.getElementById('app') ?? document.body });
