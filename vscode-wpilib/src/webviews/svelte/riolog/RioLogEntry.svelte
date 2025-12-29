<script lang="ts">
  import type { RioLogEntry } from './types';
  import { MessageType } from '../../../riolog/shared/message';
  import { formatRioLogTimestamp } from './time';
  import AnsiText from './AnsiText.svelte';

  interface Props {
    entry: RioLogEntry;
    showTimestamps: boolean;
    onToggleExpanded?: (id: number) => void;
  }

  let { entry, showTimestamps, onToggleExpanded = () => {} }: Props = $props();

  const isErrorOrWarning = entry.message.messageType !== MessageType.Print;
  const isWarning = entry.message.messageType === MessageType.Warning;
  const isExpanded = entry.expanded === true;

  const rowClass = $derived(
    entry.kind === 'error'
      ? 'log-entry error-log'
      : entry.kind === 'warning'
        ? 'log-entry warning-log'
        : 'log-entry print-log'
  );
</script>

{#if isErrorOrWarning}
  <div
    class={rowClass}
    role="button"
    tabindex="0"
    onclick={() => onToggleExpanded(entry.id)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleExpanded(entry.id);
      }
    }}
  >
    <div class={'toggle-button ' + (isExpanded ? 'expanded' : 'collapsed')}></div>
    <div class={'error-content ' + (isExpanded ? 'expanded' : 'collapsed')}>
      <div class="log-message">
        {#if showTimestamps}
          <span class="timestamp">{formatRioLogTimestamp(entry.message.timestamp)}</span>
        {/if}
      <span
        class="message-content"
        style={isWarning ? 'color: var(--vscode-warningForeground, #ff9800)' : 'color: var(--vscode-testing-iconFailed, #f44336)'}
      >
          <AnsiText lines={entry.lines} />
        </span>
      </div>

      {#if isExpanded}
        <div class="location-info">
          {#if 'location' in entry.message && entry.message.location}
            <div>&nbsp;&nbsp; at: {entry.message.location}</div>
          {/if}
        </div>
        {#if 'callStack' in entry.message && entry.message.callStack}
          <div class="stack-trace">
            {#each entry.message.callStack.split('\n') as line}
              {#if line.trim() !== ''}
                <div>&nbsp;&nbsp; from: {line}</div>
              {/if}
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{:else}
  <div class={rowClass}>
    <div class="log-message">
      {#if showTimestamps}
        <span class="timestamp">{formatRioLogTimestamp(entry.message.timestamp)}</span>
      {/if}
      <span class="message-content">
        <AnsiText lines={entry.lines} />
      </span>
    </div>
  </div>
{/if}
