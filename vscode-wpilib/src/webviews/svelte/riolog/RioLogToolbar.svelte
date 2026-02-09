<script lang="ts">
  interface Props {
    connected: boolean;
    paused: boolean;
    pausedCount: number;
    discard: boolean;
    autoScroll: boolean;
    showPrints: boolean;
    showWarnings: boolean;
    showTimestamps: boolean;
    autoReconnect: boolean;
    teamNumber: string;
    filterText: string;

    onPause: () => void;
    onDiscard: () => void;
    onClear: () => void;
    onToggleAutoScroll: () => void;
    onTogglePrints: () => void;
    onToggleWarnings: () => void;
    onToggleTimestamps: () => void;
    onToggleReconnect: () => void;
    onSave: () => void;
    onApplyTeamNumber: () => boolean;
    onTeamNumberInput: (value: string) => void;
    onFilterInput: (value: string) => void;
  }

  let {
    connected,
    paused,
    pausedCount,
    discard,
    autoScroll,
    showPrints,
    showWarnings,
    showTimestamps,
    autoReconnect,
    teamNumber,
    filterText,
    onPause,
    onDiscard,
    onClear,
    onToggleAutoScroll,
    onTogglePrints,
    onToggleWarnings,
    onToggleTimestamps,
    onToggleReconnect,
    onSave,
    onApplyTeamNumber,
    onTeamNumberInput,
    onFilterInput,
  }: Props = $props();

  let appliedFlash = $state(false);
  let inputError = $state(false);

  const applyTeam = async () => {
    const ok = onApplyTeamNumber();
    if (!ok) {
      inputError = true;
      setTimeout(() => {
        inputError = false;
      }, 1000);
      return;
    }
    appliedFlash = true;
    setTimeout(() => {
      appliedFlash = false;
    }, 1000);
  };

  const onTeamInput = (event: Event) => {
    onTeamNumberInput((event.currentTarget as HTMLInputElement).value);
    inputError = false;
  };
</script>

<div id="toolbar" class="toolbar">
  <div class="status-container">
    <div
      id="connection-status"
      class={'connection-status ' + (connected ? 'connected' : 'disconnected')}
      title={connected ? 'Connected to Robot' : 'Disconnected from Robot'}
    ></div>
  </div>

  <div class="team-number-container">
    <label for="team-number">Team:</label>
    <input
      id="team-number"
      class={'vscode-textfield' + (inputError ? ' error' : '')}
      type="number"
      min="1"
      max="99999"
      placeholder="Team #"
      value={teamNumber}
      oninput={onTeamInput}
    />
    <button
      id="team-number-button"
      class={'vscode-button' + (appliedFlash ? ' success' : '')}
      onclick={applyTeam}
      title="Apply team number"
    >
      {appliedFlash ? '✓ Applied' : 'Set'}
    </button>
  </div>

  <div class="search-container">
    <input
      id="search-input"
      class="vscode-textfield"
      type="text"
      placeholder="Search logs..."
      value={filterText}
      oninput={(e) => onFilterInput((e.currentTarget as HTMLInputElement).value)}
    />
  </div>

  <div class="buttons-container">
    <div class="button-group">
      <button
        id="pause-button"
        class={'vscode-button' + (paused ? ' active' : '')}
        onclick={onPause}
        title="Pause log updates"
      >
        {paused ? `Paused: ${pausedCount}` : 'Pause'}
      </button>
      <button
        id="discard-button"
        class={'vscode-button' + (discard ? ' active' : '')}
        onclick={onDiscard}
        title="Discard incoming messages"
      >
        {discard ? 'Resume Capture' : 'Discard'}
      </button>
      <button id="clear-button" class="vscode-button" onclick={onClear} title="Clear all log entries">
        Clear
      </button>
      <button
        id="autoscroll-button"
        class={'vscode-button' + (autoScroll ? '' : ' active')}
        onclick={onToggleAutoScroll}
        title="Toggle automatic scrolling"
      >
        {autoScroll ? 'Auto-Scroll: On' : 'Auto-Scroll: Off'}
      </button>
    </div>

    <div class="button-group">
      <button
        id="prints-button"
        class={'vscode-button' + (showPrints ? '' : ' active')}
        onclick={onTogglePrints}
        title="Toggle print messages"
      >
        {showPrints ? 'Hide Prints' : 'Show Prints'}
      </button>
      <button
        id="warnings-button"
        class={'vscode-button' + (showWarnings ? '' : ' active')}
        onclick={onToggleWarnings}
        title="Toggle warning messages"
      >
        {showWarnings ? 'Hide Warnings' : 'Show Warnings'}
      </button>
      <button
        id="timestamps-button"
        class={'vscode-button' + (showTimestamps ? '' : ' active')}
        onclick={onToggleTimestamps}
        title="Toggle timestamps"
      >
        {showTimestamps ? 'Hide Timestamps' : 'Show Timestamps'}
      </button>
      <button
        id="reconnect-button"
        class={'vscode-button' + (autoReconnect ? '' : ' active')}
        onclick={onToggleReconnect}
        title="Toggle auto reconnection"
      >
        {autoReconnect ? 'Auto-Reconnect: On' : 'Auto-Reconnect: Off'}
      </button>
      <button id="save-button" class="vscode-button" onclick={onSave} title="Save log to file">
        Save Log
      </button>
    </div>
  </div>
</div>
