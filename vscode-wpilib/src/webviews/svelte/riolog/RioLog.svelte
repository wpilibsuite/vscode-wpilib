<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { onWebviewMessage, postMessage } from '../lib';
  import { parseAnsiString } from '../../../riolog/ansi/ansiparser';
  import type { IIPCSendMessage } from '../../../riolog/shared/interfaces';
  import { ReceiveTypes, SendTypes } from '../../../riolog/shared/interfaces';
  import type { IErrorMessage, IPrintMessage } from '../../../riolog/shared/message';
  import { MessageType } from '../../../riolog/shared/message';
  import RioLogToolbar from './RioLogToolbar.svelte';
  import RioLogEntryView from './RioLogEntry.svelte';
  import { messageTypeToKind, type RioLogEntry } from './types';

  type ThemeColorsMessage = { type: 'themeColors'; message: Record<string, string> };

  let entries = $state<RioLogEntry[]>([]);
  let nextId = $state(1);

  let connected = $state(false);
  let paused = $state(false);
  let pausedCount = $state(0);
  let discard = $state(false);
  let autoReconnect = $state(true);
  let showWarnings = $state(true);
  let showPrints = $state(true);
  let showTimestamps = $state(false);
  let autoScroll = $state(true);
  let filterText = $state('');
  let teamNumber = $state('');

  const maxLogEntries = 2000;

  let logContainer: HTMLDivElement | null = null;
  let toolbarEl: HTMLElement | null = null;

  const effectiveFilter = $derived(filterText.trim().toLowerCase());

  const visibleEntries = $derived(
    entries.filter((entry) => {
      if (entry.kind === 'warning' && !showWarnings) return false;
      if (entry.kind === 'print' && !showPrints) return false;
      if (effectiveFilter === '') return true;
      return entry.searchText.includes(effectiveFilter);
    })
  );

  function addMessage(message: IPrintMessage | IErrorMessage) {
    const kind = messageTypeToKind(message.messageType);
    const baseText =
      message.messageType === MessageType.Print
        ? (message as IPrintMessage).line
        : (message as IErrorMessage).details;

    const lines = baseText
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => (line.includes('\u001b[') ? parseAnsiString(line) : [{ text: line, state: {} }]));
    const searchText =
      message.messageType === MessageType.Print
        ? (message as IPrintMessage).line.toLowerCase()
        : `${(message as IErrorMessage).details}\n${(message as IErrorMessage).location}\n${(message as IErrorMessage).callStack}`.toLowerCase();

    const entry: RioLogEntry = {
      id: nextId++,
      kind,
      message,
      lines,
      searchText,
      expanded: false,
    };

    entries = [...entries, entry];
    if (entries.length > maxLogEntries) {
      entries = entries.slice(entries.length - maxLogEntries);
    }
  }

  function addWelcomeMessageOnce() {
    if (entries.length > 0) return;
    const welcomeMessage: IPrintMessage = {
      messageType: MessageType.Print,
      line:
        '\u001b[1m\u001b[36m=== WPILib RioLog Started ===\u001b[0m\n' +
        '\u001b[32mWaiting for robot connection...\u001b[0m\n' +
        '\u001b[33mTIPS:\u001b[0m\n' +
        '• \u001b[0mUse \u001b[1mSet\u001b[0m button to change team number\n' +
        '• \u001b[0mClick on errors/warnings to expand details\n' +
        '• \u001b[0mUse search box to filter messages\n' +
        '• \u001b[0mToggle auto-scrolling for viewing older logs\n' +
        '• \u001b[0mSave logs to file for later analysis',
      timestamp: Date.now() / 1000,
      seqNumber: 0,
    };
    addMessage(welcomeMessage);
  }

  function sendReceiveMessage(message: unknown, type: ReceiveTypes) {
    postMessage({ type, message });
  }

  function togglePause() {
    paused = !paused;
    if (paused) {
      pausedCount = 0;
    }
    sendReceiveMessage(paused, ReceiveTypes.Pause);
  }

  function toggleDiscard() {
    discard = !discard;
    sendReceiveMessage(discard, ReceiveTypes.Discard);
  }

  function clearLog() {
    entries = [];
    pausedCount = 0;
  }

  function toggleAutoScroll() {
    autoScroll = !autoScroll;
    if (autoScroll) {
      void tick().then(() => {
        logContainer?.scrollTo({ top: logContainer.scrollHeight });
      });
    }
  }

  function togglePrints() {
    showPrints = !showPrints;
  }

  function toggleWarnings() {
    showWarnings = !showWarnings;
  }

  function toggleTimestamps() {
    showTimestamps = !showTimestamps;
  }

  function toggleReconnect() {
    autoReconnect = !autoReconnect;
    sendReceiveMessage(autoReconnect, ReceiveTypes.Reconnect);
  }

  function saveLog() {
    const logs = entries.map((entry) => JSON.stringify(entry.message));
    sendReceiveMessage(logs, ReceiveTypes.Save);
  }

  function applyTeamNumber(): boolean {
    const num = Number.parseInt(teamNumber, 10);
    if (!Number.isFinite(num) || num < 0 || num > 99999) {
      return false;
    }
    sendReceiveMessage(num, ReceiveTypes.ChangeNumber);
    return true;
  }

  function toggleExpanded(id: number) {
    entries = entries.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e));
  }

  async function updateLayout() {
    if (!toolbarEl || !logContainer) return;
    logContainer.style.maxHeight = `calc(100vh - ${toolbarEl.offsetHeight}px)`;
  }

  function addConnectionMessage(isConnected: boolean) {
    const message: IPrintMessage = {
      line: isConnected
        ? '\u001b[32mRobot connection established\u001b[0m'
        : '\u001b[31mRobot connection lost\u001b[0m',
      messageType: MessageType.Print,
      seqNumber: 0,
      timestamp: Date.now() / 1000,
    };
    addMessage(message);
  }

  onMount(() => {
    addWelcomeMessageOnce();

    const unsubscribe = onWebviewMessage<IIPCSendMessage | ThemeColorsMessage>((data) => {
      if (!data) return;
      if ((data as ThemeColorsMessage).type === 'themeColors') {
        return;
      }

      const msg = data as IIPCSendMessage;
      switch (msg.type) {
        case SendTypes.New:
          addMessage(msg.message as IPrintMessage | IErrorMessage);
          break;
        case SendTypes.Batch:
          for (const m of msg.message as (IPrintMessage | IErrorMessage)[]) {
            addMessage(m);
          }
          break;
        case SendTypes.PauseUpdate:
          pausedCount = msg.message as number;
          break;
        case SendTypes.ConnectionChanged: {
          const nextState = msg.message as boolean;
          connected = nextState;
          addConnectionMessage(nextState);
          break;
        }
        default:
          break;
      }
    });

    const resizeListener = () => void updateLayout();
    window.addEventListener('resize', resizeListener);

    const ro = new ResizeObserver(() => void updateLayout());
    if (toolbarEl) ro.observe(toolbarEl);

    void updateLayout();

    return () => {
      unsubscribe();
      window.removeEventListener('resize', resizeListener);
      ro.disconnect();
    };
  });

  let lastVisibleCount = $state(0);
  $effect(async () => {
    const count = visibleEntries.length;
    if (count !== lastVisibleCount) {
      lastVisibleCount = count;
      if (autoScroll) {
        await tick();
        logContainer?.scrollTo({ top: logContainer.scrollHeight });
      }
    }
  });
</script>

<div id="mainDiv">
  <div id="log-container" bind:this={logContainer}>
    {#each visibleEntries as entry (entry.id)}
      <RioLogEntryView entry={entry} showTimestamps={showTimestamps} onToggleExpanded={toggleExpanded} />
    {/each}
  </div>

  <div bind:this={toolbarEl}>
    <RioLogToolbar
      {connected}
      {paused}
      {pausedCount}
      {discard}
      {autoScroll}
      {showPrints}
      {showWarnings}
      {showTimestamps}
      {autoReconnect}
      {teamNumber}
      {filterText}
      onPause={togglePause}
      onDiscard={toggleDiscard}
      onClear={clearLog}
      onToggleAutoScroll={toggleAutoScroll}
      onTogglePrints={togglePrints}
      onToggleWarnings={toggleWarnings}
      onToggleTimestamps={toggleTimestamps}
      onToggleReconnect={toggleReconnect}
      onSave={saveLog}
      onApplyTeamNumber={applyTeamNumber}
      onTeamNumberInput={(value) => (teamNumber = value)}
      onFilterInput={(value) => (filterText = value)}
    />
  </div>
</div>
