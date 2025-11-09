import { mount } from 'svelte';
import Gradle2025Import from './Gradle2025Import.svelte';

const target = document.getElementById('app') ?? document.body;

const app = mount(Gradle2025Import, {
  target,
});

export default app;

