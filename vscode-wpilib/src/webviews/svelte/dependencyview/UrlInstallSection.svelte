<script lang="ts">
  interface Props {
    url?: string;
    onInstall?: (url: string) => void;
  }

  let { url = $bindable(''), onInstall = () => {} }: Props = $props();

  const install = () => {
    if (url.trim().length === 0) {
      return;
    }
    onInstall(url.trim());
    url = '';
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
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
      onkeydown={onKeyDown}
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
