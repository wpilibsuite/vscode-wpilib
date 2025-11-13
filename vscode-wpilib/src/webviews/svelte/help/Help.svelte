<script lang="ts">
  import { onMount } from 'svelte';
  import { postMessage } from '../lib';

  let logoPath = $state('');

  onMount(() => {
    const appElement = document.getElementById('app');
    const resourceBase = appElement?.getAttribute('data-resource-base') || '';
    logoPath = `${resourceBase}/resources/wpilib-generic.svg`;
  });

  const openCommandPalette = () => {
    postMessage({ command: 'openCommandPalette' });
  };

  const openDocumentation = () => {
    postMessage({ command: 'openDocumentation' });
  };
</script>

<div class="project-container">
  <img src={logoPath} alt="WPILib" height="75" />

  <h1 class="project-title">WPILib Help</h1>

  <div class="project-row">
    <p>
      Welcome to WPILib Help! Thank you for alpha testing the Systemcore and 2027 WPILib. Please
      see
      <a href="https://github.com/wpilibsuite/SystemcoreTesting/">
        https://github.com/wpilibsuite/SystemcoreTesting/</a
      >
      for the expectations for testing and to provide your feedback.
    </p>

    <p>
      To open this window again, open the Command Palette (F1 or View-&gt;Command Palette), and
      select
      <b>Open WPILib Help.</b>
    </p>
    <p>
      For more help, see
      <a href="https://docs.wpilib.org/en/2027">the 2027 WPILib documentation.</a>
    </p>
  </div>

  <div class="project-row">
    <h2 class="project-subtitle">Common Tasks</h2>
    <ul>
      <li>
        Create a new project: Click on the Command Palette and type "WPILib: Create a new
        project"
      </li>
      <li>
        Deploy code to the robot: Click on the Command Palette and type "WPILib: Deploy Robot
        Code"
      </li>
      <li>
        Start a simulation: Click on the Command Palette and type "WPILib: Simulate Robot Code"
      </li>
      <li>Install vendor libraries: Click on "WPILib Dependencies" in the Activity Bar</li>
    </ul>
  </div>

  <div class="project-row">
    <h2 class="project-subtitle">Setting Up Your Workspace</h2>
    <ul>
      <li>
        Enable desktop support: Click on the Command Palette and type "WPILib: Set Desktop
        Support"
      </li>
      <li>Run RioLog: Click on the Command Palette and type "WPILib: Start RioLog"</li>
      <li>
        Import a project: Click on the Command Palette and type "WPILib: Import a WPILib 2025
        Gradle project"
      </li>
    </ul>
  </div>

  <div class="project-actions">
    <button id="openCommandPalette" type="button" class="vscode-button" onclick={openCommandPalette}>
      Open Command Palette
    </button>
    <button id="openDocumentation" type="button" class="vscode-button" onclick={openDocumentation}>
      Open WPILib Documentation
    </button>
  </div>
</div>

