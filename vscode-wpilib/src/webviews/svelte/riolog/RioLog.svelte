<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { onWebviewMessage } from '../lib';
  import { parseAnsiString } from '../../../riolog/ansi/ansiparser';
  import type { IIPCSendMessage } from '../../../riolog/shared/interfaces';
  import { ReceiveTypes, SendTypes } from '../../../riolog/shared/interfaces';
  import type { IErrorMessage, IPrintMessage } from '../../../riolog/shared/message';
  import { MessageType } from '../../../riolog/shared/message';
  import RioLogToolbar from './RioLogToolbar.svelte';
  import RioLogEntryView from './RioLogEntry.svelte';
  import { messageTypeToKind, type RioLogEntry } from './types';

  const vscode = acquireVsCodeApi();

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

  const effectiveFilter = $derived(filterText.trim().toLowerCase());

  const visibleEntries = $derived(
    entries.filter((entry) => {
      if (entry.kind === 'warning' && !showWarnings) return false;
      if (entry.kind === 'print' && !showPrints) return false;
      if (effectiveFilter === '') return true;
      return entry.searchText.includes(effectiveFilter);
    })
  );

  const buildEntry = (message: IPrintMessage | IErrorMessage): RioLogEntry => {
    const kind = messageTypeToKind(message.messageType);
    const baseText =
      message.messageType === MessageType.Print
        ? (message as IPrintMessage).line
        : (message as IErrorMessage).details;

    const lines = baseText
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) =>
        line.includes('\u001b[') ? parseAnsiString(line) : [{ text: line, state: {} }]
      );
    const searchText =
      message.messageType === MessageType.Print
        ? (message as IPrintMessage).line.toLowerCase()
        : `${(message as IErrorMessage).details}\n${(message as IErrorMessage).location}\n${(message as IErrorMessage).callStack}`.toLowerCase();

    return {
      id: nextId++,
      kind,
      message,
      lines,
      searchText,
      expanded: false,
    };
  };

  const trimEntries = () => {
    if (entries.length > maxLogEntries) {
      entries.splice(0, entries.length - maxLogEntries);
    }
  };

  const addMessage = (message: IPrintMessage | IErrorMessage) => {
    entries.push(buildEntry(message));
    trimEntries();
  };

  const addMessages = (messages: (IPrintMessage | IErrorMessage)[]) => {
    for (const message of messages) {
      entries.push(buildEntry(message));
    }
    trimEntries();
  };

  const addWelcomeMessageOnce = () => {
    if (entries.length > 0) return;
    const welcomeMessage: IPrintMessage = {
      messageType: MessageType.Print,
      line: `\u001b[1m\u001b[36m=== WPILib RioLog Started ===\u001b[0m
\u001b[32mWaiting for robot connection...\u001b[0m
\u001b[33mTIPS:\u001b[0m
• \u001b[0mUse \u001b[1mSet\u001b[0m button to change team number
• \u001b[0mClick on errors/warnings to expand details
• \u001b[0mUse search box to filter messages
• \u001b[0mToggle auto-scrolling for viewing older logs
• \u001b[0mSave logs to file for later analysis`,
      timestamp: Date.now() / 1000,
      seqNumber: 0,
    };
    addMessage(welcomeMessage);
  };

  const sendReceiveMessage = (message: unknown, type: ReceiveTypes) => {
    vscode.postMessage({ type, message });
  };

  const togglePause = () => {
    paused = !paused;
    if (paused) {
      pausedCount = 0;
    }
    sendReceiveMessage(paused, ReceiveTypes.Pause);
  };

  const toggleDiscard = () => {
    discard = !discard;
    sendReceiveMessage(discard, ReceiveTypes.Discard);
  };

  const clearLog = () => {
    entries.length = 0;
    pausedCount = 0;
  };

  const toggleAutoScroll = () => {
    autoScroll = !autoScroll;
    if (autoScroll) {
      void tick().then(() => {
        logContainer?.scrollTo({ top: logContainer.scrollHeight });
      });
    }
  };

  const togglePrints = () => {
    showPrints = !showPrints;
  };

  const toggleWarnings = () => {
    showWarnings = !showWarnings;
  };

  const toggleTimestamps = () => {
    showTimestamps = !showTimestamps;
  };

  const toggleReconnect = () => {
    autoReconnect = !autoReconnect;
    sendReceiveMessage(autoReconnect, ReceiveTypes.Reconnect);
  };

  const saveLog = () => {
    const logs = entries.map((entry) => JSON.stringify(entry.message));
    sendReceiveMessage(logs, ReceiveTypes.Save);
  };

  const applyTeamNumber = (): boolean => {
    const num = Number.parseInt(teamNumber, 10);
    if (!Number.isFinite(num) || num < 0 || num > 99999) {
      return false;
    }
    sendReceiveMessage(num, ReceiveTypes.ChangeNumber);
    return true;
  };

  const toggleExpanded = (id: number) => {
    const entry = entries.find((candidate) => candidate.id === id);
    if (entry) {
      entry.expanded = !entry.expanded;
    }
  };

  const addConnectionMessage = (isConnected: boolean) => {
    const message: IPrintMessage = {
      line: isConnected
        ? '\u001b[32mRobot connection established\u001b[0m'
        : '\u001b[31mRobot connection lost\u001b[0m',
      messageType: MessageType.Print,
      seqNumber: 0,
      timestamp: Date.now() / 1000,
    };
    addMessage(message);
  };

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
          addMessages(msg.message as (IPrintMessage | IErrorMessage)[]);
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

    return () => {
      unsubscribe();
    };
  });

  let lastVisibleCount = $state(0);
  $effect(() => {
    const count = visibleEntries.length;
    if (count !== lastVisibleCount) {
      lastVisibleCount = count;
      if (autoScroll) {
        void tick().then(() => {
          logContainer?.scrollTo({ top: logContainer.scrollHeight });
        });
      }
    }
  });
</script>

<div id="mainDiv">
  <div id="log-container" bind:this={logContainer}>
    {#each visibleEntries as entry (entry.id)}
      <RioLogEntryView {entry} {showTimestamps} onToggleExpanded={toggleExpanded} />
    {/each}
  </div>

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
