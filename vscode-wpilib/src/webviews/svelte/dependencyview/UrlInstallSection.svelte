<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  interface Props {
    url?: string;
  }

  let { url = $bindable('') }: Props = $props();

  const install = () => {
    if (url.trim().length === 0) {
      return;
    }
    dispatch('install', url.trim());
    url = '';
  };

  const onKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      install();
    }
  };
</script>

<div class="url-install-section">
  <div class="url-input-container">
    <input
      id="url-input"
      class="vscode-textfield"
      type="text"
      placeholder="Enter vendordep URL..."
      bind:value={url}
      onkeypress={onKeyPress}
    />
    <button id="install-url-action" class="vscode-button" onclick={install}>
      <i class="codicon codicon-cloud-download"></i>
      <span> Install</span>
    </button>
  </div>
  <div class="url-help-text">
    Enter a vendor dependency JSON URL to install a library not listed in the available dependencies.
  </div>
</div>

