'use strict';

import { IIPCSendMessage, ReceiveTypes, SendTypes } from './interfaces';
import { IErrorMessage, IPrintMessage, MessageType } from './message';
import { AnsiSegment, applyAnsiStyling, parseAnsiString } from '../ansi/ansiparser';

// Define these functions here, they'll be implemented in implscript.ts
let checkResize: () => void;
let scrollImpl: () => void;
let sendMessage: (message: any) => void;

// Function to set the implementation functions from implscript
export function setImplFunctions(
  checkResizeImpl: () => void,
  scrollImplFunc: () => void,
  sendMessageFunc: (message: any) => void
) {
  checkResize = checkResizeImpl;
  scrollImpl = scrollImplFunc;
  sendMessage = sendMessageFunc;
}

let paused = false;
let discard = false;
let showWarnings = true;
let showPrints = true;
let autoReconnect = true;
let showTimestamps = false;
let autoScroll = true;
let filterText = '';
let maxLogEntries = 2000;

let UI_COLORS = {
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
};

function updateThemeColors(colors: Record<string, string>) {
  UI_COLORS = { ...UI_COLORS, ...colors };
}

export function onPause() {
  paused = !paused;
  const pauseElement = document.getElementById('pause-button');
  if (pauseElement === null) {
    return;
  }

  if (paused) {
    pauseElement.innerHTML = 'Paused: 0';
    pauseElement.classList.add('active');
  } else {
    pauseElement.innerHTML = 'Pause';
    pauseElement.classList.remove('active');
  }

  sendMessage({
    message: paused,
    type: ReceiveTypes.Pause,
  });
}

export function onDiscard() {
  discard = !discard;
  const dButton = document.getElementById('discard-button');
  if (dButton === null) {
    return;
  }

  if (discard) {
    dButton.innerHTML = 'Resume Capture';
    dButton.classList.add('active');
  } else {
    dButton.innerHTML = 'Discard';
    dButton.classList.remove('active');
  }

  sendMessage({
    message: discard,
    type: ReceiveTypes.Discard,
  });
}

export function onClear() {
  const list = document.getElementById('log-container');
  if (list === null) {
    return;
  }
  list.innerHTML = '';
}

export function onAutoScrollToggle() {
  autoScroll = !autoScroll;
  const scrollButton = document.getElementById('autoscroll-button');
  if (scrollButton === null) {
    return;
  }

  if (autoScroll) {
    scrollButton.innerHTML = 'Auto-Scroll: On';
    scrollButton.classList.remove('active');
    scrollImpl();
  } else {
    scrollButton.innerHTML = 'Auto-Scroll: Off';
    scrollButton.classList.add('active');
  }
}

export function onShowWarnings() {
  showWarnings = !showWarnings;
  const warningsButton = document.getElementById('warnings-button');
  if (warningsButton === null) {
    return;
  }

  if (showWarnings) {
    warningsButton.innerHTML = 'Hide Warnings';
    warningsButton.classList.remove('active');
  } else {
    warningsButton.innerHTML = 'Show Warnings';
    warningsButton.classList.add('active');
  }

  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  const items = container.getElementsByClassName('warning-log');
  for (let i = 0; i < items.length; ++i) {
    if (showWarnings) {
      (items[i] as HTMLElement).style.display = 'block';
    } else {
      (items[i] as HTMLElement).style.display = 'none';
    }
  }

  applyLogFilter();
  checkResize();
}

export function onShowPrints() {
  showPrints = !showPrints;
  const printButton = document.getElementById('prints-button');
  if (printButton === null) {
    return;
  }

  if (showPrints) {
    printButton.innerHTML = 'Hide Prints';
    printButton.classList.remove('active');
  } else {
    printButton.innerHTML = 'Show Prints';
    printButton.classList.add('active');
  }

  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  const items = container.getElementsByClassName('print-log');
  for (let i = 0; i < items.length; ++i) {
    if (showPrints) {
      (items[i] as HTMLElement).style.display = 'block';
    } else {
      (items[i] as HTMLElement).style.display = 'none';
    }
  }

  applyLogFilter();
  checkResize();
}

export function onAutoReconnect() {
  autoReconnect = !autoReconnect;

  // Send message to backend
  sendMessage({
    message: autoReconnect,
    type: ReceiveTypes.Reconnect,
  });

  const arButton = document.getElementById('reconnect-button');
  if (arButton === null) {
    return;
  }

  if (autoReconnect) {
    arButton.innerHTML = 'Auto-Reconnect: On';
    arButton.classList.remove('active');
  } else {
    arButton.innerHTML = 'Auto-Reconnect: Off';
    arButton.classList.add('active');

    // Force disconnect when auto-reconnect is disabled
    sendMessage({
      message: false,
      type: ReceiveTypes.Reconnect,
    });
  }
}

export function onShowTimestamps() {
  showTimestamps = !showTimestamps;
  const tsButton = document.getElementById('timestamps-button');
  if (tsButton === null) {
    return;
  }

  if (showTimestamps) {
    tsButton.innerHTML = 'Hide Timestamps';
    tsButton.classList.remove('active');
  } else {
    tsButton.innerHTML = 'Show Timestamps';
    tsButton.classList.add('active');
  }

  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  const timestamps = container.getElementsByClassName('timestamp');
  for (let i = 0; i < timestamps.length; ++i) {
    if (showTimestamps) {
      (timestamps[i] as HTMLElement).style.display = 'inline';
    } else {
      (timestamps[i] as HTMLElement).style.display = 'none';
    }
  }

  checkResize();
}

export function onSaveLog() {
  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  const items = container.getElementsByClassName('log-entry');
  const logs: string[] = [];

  for (let i = 0; i < items.length; ++i) {
    const m = items[i].getAttribute('data-message');
    if (m === null) {
      continue;
    }
    logs.push(m);
  }

  sendMessage({
    message: logs,
    type: ReceiveTypes.Save,
  });
}

export function onSearch(event: Event) {
  const input = event.target as HTMLInputElement;
  filterText = input.value.toLowerCase();
  applyLogFilter();
}

function applyLogFilter() {
  if (filterText === '') {
    // Show all entries that should be visible based on their type
    const container = document.getElementById('log-container');
    if (container === null) {
      return;
    }

    const items = container.getElementsByClassName('log-entry');
    for (let i = 0; i < items.length; ++i) {
      const item = items[i] as HTMLElement;
      const type = item.getAttribute('data-type');

      if (type === 'warning' && !showWarnings) {
        item.style.display = 'none';
      } else if (type === 'print' && !showPrints) {
        item.style.display = 'none';
      } else {
        item.style.display = 'block';
      }
    }
    return;
  }

  // Filter based on text content
  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  const items = container.getElementsByClassName('log-entry');
  for (let i = 0; i < items.length; ++i) {
    const item = items[i] as HTMLElement;
    const type = item.getAttribute('data-type');

    // Skip if it's already hidden by type filters
    if ((type === 'warning' && !showWarnings) || (type === 'print' && !showPrints)) {
      item.style.display = 'none';
      continue;
    }

    const content = item.textContent?.toLowerCase() || '';
    if (content.includes(filterText)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  }
}

export function onConnect() {
  const statusIndicator = document.getElementById('connection-status');
  if (statusIndicator) {
    statusIndicator.className = 'connection-status connected';
    statusIndicator.setAttribute('title', 'Connected to Robot');
  }

  // Add connection message
  const connectedMessage: IPrintMessage = {
    line: '\u001b[32mRobot connection established\u001b[0m',
    messageType: MessageType.Print,
    seqNumber: 0,
    timestamp: Date.now() / 1000
  };
  addMessage(connectedMessage);
}

export function onDisconnect() {
  const statusIndicator = document.getElementById('connection-status');
  if (statusIndicator) {
    statusIndicator.className = 'connection-status disconnected';
    statusIndicator.setAttribute('title', 'Disconnected from Robot');
  }

  // Add disconnection message
  const disconnectedMessage: IPrintMessage = {
    line: '\u001b[31mRobot connection lost\u001b[0m',
    messageType: MessageType.Print,
    seqNumber: 0,
    timestamp: Date.now() / 1000
  };
  addMessage(disconnectedMessage);
}

export function onChangeTeamNumber() {
  const input = document.getElementById('team-number') as HTMLInputElement;
  if (!input) {
    return;
  }

  const teamNumber = parseInt(input.value, 10);
  if (isNaN(teamNumber) || teamNumber < 0 || teamNumber > 99999) {
    // Visual indication of invalid input
    input.classList.add('error');
    setTimeout(() => {
      input.classList.remove('error');
    }, 1000);
    return;
  }

  sendMessage({
    message: teamNumber,
    type: ReceiveTypes.ChangeNumber,
  });

  // Visual confirmation
  const button = document.getElementById('team-number-button');
  if (button) {
    const originalText = button.textContent || '';
    button.textContent = '✓ Applied';
    button.classList.add('success');

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('success');
    }, 1000);
  }
}

// Create a styled segment from ANSI parsed content
function createStyledElement(segment: AnsiSegment): HTMLSpanElement {
  const span = document.createElement('span');
  const tNode = document.createTextNode(segment.text);
  span.appendChild(tNode);
  applyAnsiStyling(span, segment.state);
  return span;
}

function insertMessage(ts: number, line: string, li: HTMLElement, color?: string) {
  const messageContent = document.createElement('div');
  messageContent.className = 'log-message';

  // Create timestamp element
  const tsSpan = document.createElement('span');
  tsSpan.className = 'timestamp';
  tsSpan.textContent = new Date(ts * 1000).toISOString().slice(11, -1) + ': ';
  if (!showTimestamps) {
    tsSpan.style.display = 'none';
  }
  messageContent.appendChild(tsSpan);

  // Create the content container
  const contentSpan = document.createElement('span');
  contentSpan.className = 'message-content';
  if (color !== undefined) {
    contentSpan.style.color = color;
  }

  // Process each line
  const lines = line.split('\n');
  let first = true;

  for (const item of lines) {
    if (item.trim() === '') {
      continue;
    }

    if (first === false) {
      contentSpan.appendChild(document.createElement('br'));
    }
    first = false;

    // Check if the line contains ANSI codes
    if (item.includes('\u001b[')) {
      const segments = parseAnsiString(item);
      for (const segment of segments) {
        contentSpan.appendChild(createStyledElement(segment));
      }
    } else {
      // No ANSI codes, just append text
      const tNode = document.createTextNode(item);
      contentSpan.appendChild(tNode);
    }
  }

  messageContent.appendChild(contentSpan);
  li.appendChild(messageContent);
}

function insertStackTrace(st: string, container: HTMLElement, color?: string) {
  const div = document.createElement('div');
  div.className = 'stack-trace';

  const split = st.split('\n');
  let first = true;
  for (const item of split) {
    if (item.trim() === '') {
      continue;
    }
    if (first === false) {
      div.appendChild(document.createElement('br'));
    }
    first = false;
    const tNode = document.createTextNode('\u00a0\u00a0\u00a0\u00a0 at: ' + item);
    div.appendChild(tNode);
  }
  if (color !== undefined) {
    div.style.color = color;
  }
  container.appendChild(div);
}

function insertLocation(loc: string, container: HTMLElement, color?: string) {
  const div = document.createElement('div');
  div.className = 'location-info';

  const split = loc.split('\n');
  let first = true;
  for (const item of split) {
    if (item.trim() === '') {
      continue;
    }
    if (first === false) {
      div.appendChild(document.createElement('br'));
    }
    first = false;
    const tNode = document.createTextNode('\u00a0\u00a0 from: ' + item);
    div.appendChild(tNode);
  }
  if (color !== undefined) {
    div.style.color = color;
  }
  container.appendChild(div);
}

export function addMessage(message: IPrintMessage | IErrorMessage) {
  if (message.messageType === MessageType.Print) {
    addPrint(message as IPrintMessage);
  } else {
    addError(message as IErrorMessage);
  }
}

function limitList() {
  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  while (container.childElementCount > maxLogEntries && container.firstChild !== null) {
    container.removeChild(container.firstChild);
  }
}

export function addPrint(message: IPrintMessage) {
  limitList();
  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  const entry = document.createElement('div');
  entry.className = 'log-entry print-log';
  entry.setAttribute('data-type', 'print');
  entry.setAttribute('data-message', JSON.stringify(message));

  if (!showPrints) {
    entry.style.display = 'none';
  }

  insertMessage(message.timestamp, message.line, entry);
  container.appendChild(entry);

  // Apply search filter if needed
  if (filterText !== '') {
    const content = entry.textContent?.toLowerCase() || '';
    if (!content.includes(filterText)) {
      entry.style.display = 'none';
    }
  }

  if (autoScroll) {
    scrollImpl();
  }
}

// Creates HTML for an expanded error view
export function createErrorContent(message: IErrorMessage, container: HTMLElement, color?: string) {
  // Clear existing content first
  container.innerHTML = '';

  // First append the message
  insertMessage(message.timestamp, message.details, container, color);

  // Then append location, tabbed in once
  insertLocation(message.location, container, color);

  // Then append stack trace, tabbed in twice
  insertStackTrace(message.callStack, container, color);
}

// Create HTML for a collapsed error view
export function createCollapsedErrorContent(message: IErrorMessage, container: HTMLElement, color?: string) {
  // Clear existing content
  container.innerHTML = '';
  
  // Just show the error message
  insertMessage(message.timestamp, message.details, container, color);
}

export function addError(message: IErrorMessage) {
  limitList();
  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }

  const entry = document.createElement('div');
  entry.className = message.messageType === MessageType.Warning
    ? 'log-entry warning-log'
    : 'log-entry error-log';
  entry.setAttribute('data-expanded', 'false');
  entry.setAttribute('data-type', message.messageType === MessageType.Warning ? 'warning' : 'error');
  entry.setAttribute('data-message', JSON.stringify(message));

  // Hide warnings if they're filtered out
  if (message.messageType === MessageType.Warning && !showWarnings) {
    entry.style.display = 'none';
  }

  // Create the toggle button
  const toggleButton = document.createElement('div');
  toggleButton.className = 'toggle-button collapsed';
  entry.appendChild(toggleButton);

  // Create the content container
  const contentContainer = document.createElement('div');
  contentContainer.className = 'error-content collapsed';
  entry.appendChild(contentContainer);

  // Add the initial collapsed view content
  const textColor = message.messageType === MessageType.Warning
    ? 'var(--vscode-warningForeground, ' + UI_COLORS.warning + ')'
    : 'var(--vscode-testing-iconFailed, ' + UI_COLORS.error + ')';
    
  createCollapsedErrorContent(message, contentContainer, textColor);

  // Add click handler to toggle expansion
  entry.addEventListener('click', function() {
    const isExpanded = this.getAttribute('data-expanded') === 'true';
    const toggleBtn = this.querySelector('.toggle-button');
    const contentCtr = this.querySelector('.error-content');
    
    if (isExpanded) {
      // Collapse
      this.setAttribute('data-expanded', 'false');
      if (toggleBtn) toggleBtn.className = 'toggle-button collapsed';
      if (contentCtr) {
        contentCtr.className = 'error-content collapsed';
        createCollapsedErrorContent(message, contentCtr as HTMLElement, textColor);
      }
    } else {
      // Expand
      this.setAttribute('data-expanded', 'true');
      if (toggleBtn) toggleBtn.className = 'toggle-button expanded';
      if (contentCtr) {
        contentCtr.className = 'error-content expanded';
        createErrorContent(message, contentCtr as HTMLElement, textColor);
      }
    }
    
    checkResize();
  });

  container.appendChild(entry);

  // Apply search filter if needed
  if (filterText !== '') {
    const content = entry.textContent?.toLowerCase() || '';
    if (!content.includes(filterText)) {
      entry.style.display = 'none';
    }
  }

  if (autoScroll) {
    scrollImpl();
  }
}

export function checkResizeImpl() {
  const container = document.getElementById('log-container');
  if (container === null) {
    return;
  }
  // Container height is managed through CSS
}

export function handleMessage(data: IIPCSendMessage | any): void {
  // Handle theme color update message
  if (data.type === 'themeColors') {
    updateThemeColors(data.message);
    return;
  }

  switch (data.type) {
    case SendTypes.New:
      addMessage(data.message as IPrintMessage | IErrorMessage);
      break;

    case SendTypes.Batch:
      for (const message of data.message as (IPrintMessage | IErrorMessage)[]) {
        addMessage(message);
      }
      break;

    case SendTypes.PauseUpdate:
      const pauseButton = document.getElementById('pause-button');
      if (pauseButton !== null) {
        pauseButton.innerHTML = `Paused: ${data.message}`;
      }
      break;

    case SendTypes.ConnectionChanged:
      const connected: boolean = data.message as boolean;
      if (connected) {
        onConnect();
      } else {
        onDisconnect();
      }
      break;

    default:
      break;
  }
}

export function createToolbar(): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.id = 'toolbar';
  toolbar.className = 'toolbar';

  // Create the connection status indicator
  const statusContainer = document.createElement('div');
  statusContainer.className = 'status-container';

  const connectionStatus = document.createElement('div');
  connectionStatus.id = 'connection-status';
  connectionStatus.className = 'connection-status disconnected';
  connectionStatus.setAttribute('title', 'Disconnected from Robot');
  statusContainer.appendChild(connectionStatus);

  // Create the team number input group
  const teamNumberContainer = document.createElement('div');
  teamNumberContainer.className = 'team-number-container';

  const teamNumberLabel = document.createElement('label');
  teamNumberLabel.htmlFor = 'team-number';
  teamNumberLabel.textContent = 'Team:';
  teamNumberContainer.appendChild(teamNumberLabel);

  const teamNumberInput = document.createElement('input');
  teamNumberInput.type = 'number';
  teamNumberInput.id = 'team-number';
  teamNumberInput.className = 'team-number-input';
  teamNumberInput.min = '1';
  teamNumberInput.max = '99999';
  teamNumberInput.placeholder = 'Team #';
  teamNumberContainer.appendChild(teamNumberInput);

  const teamNumberButton = document.createElement('button');
  teamNumberButton.id = 'team-number-button';
  teamNumberButton.className = 'toolbar-button';
  teamNumberButton.textContent = 'Set';
  teamNumberButton.addEventListener('click', onChangeTeamNumber);
  teamNumberContainer.appendChild(teamNumberButton);

  // Search filter
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'search-input';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search logs...';
  searchInput.addEventListener('input', onSearch);
  searchContainer.appendChild(searchInput);

  // Button groups
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'buttons-container';

  // Control buttons
  const controlButtons = document.createElement('div');
  controlButtons.className = 'button-group';

  const buttons = [
    { id: 'pause-button', text: 'Pause', handler: onPause, tooltip: 'Pause log updates' },
    { id: 'discard-button', text: 'Discard', handler: onDiscard, tooltip: 'Discard incoming messages' },
    { id: 'clear-button', text: 'Clear', handler: onClear, tooltip: 'Clear all log entries' },
    { id: 'autoscroll-button', text: 'Auto-Scroll: On', handler: onAutoScrollToggle, tooltip: 'Toggle automatic scrolling' },
  ];

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.id = btn.id;
    button.className = 'toolbar-button';
    button.textContent = btn.text;
    button.title = btn.tooltip;
    button.addEventListener('click', btn.handler);
    controlButtons.appendChild(button);
  });

  // Filter buttons
  const filterButtons = document.createElement('div');
  filterButtons.className = 'button-group';

  const filterBtns = [
    { id: 'prints-button', text: 'Hide Prints', handler: onShowPrints, tooltip: 'Toggle print messages' },
    { id: 'warnings-button', text: 'Hide Warnings', handler: onShowWarnings, tooltip: 'Toggle warning messages' },
    { id: 'timestamps-button', text: 'Show Timestamps', handler: onShowTimestamps, tooltip: 'Toggle timestamps', active: true },
    { id: 'reconnect-button', text: 'Auto-Reconnect: On', handler: onAutoReconnect, tooltip: 'Toggle auto reconnection' },
    { id: 'save-button', text: 'Save Log', handler: onSaveLog, tooltip: 'Save log to file' },
  ];

  filterBtns.forEach(btn => {
    const button = document.createElement('button');
    button.id = btn.id;
    button.className = 'toolbar-button';
    if (btn.active) {
      button.classList.add('active');
    }
    button.textContent = btn.text;
    button.title = btn.tooltip;
    button.addEventListener('click', btn.handler);
    filterButtons.appendChild(button);
  });

  // Add all components to the toolbar
  buttonsContainer.appendChild(controlButtons);
  buttonsContainer.appendChild(filterButtons);

  toolbar.appendChild(statusContainer);
  toolbar.appendChild(teamNumberContainer);
  toolbar.appendChild(searchContainer);
  toolbar.appendChild(buttonsContainer);

  return toolbar;
}

export function setLivePage() {
  const mainDiv = document.getElementById('mainDiv');
  if (!mainDiv) {
    return;
  }

  // Clear the container
  mainDiv.innerHTML = '';

  // Create log container
  const logContainer = document.createElement('div');
  logContainer.id = 'log-container';
  mainDiv.appendChild(logContainer);

  // Create toolbar
  mainDiv.appendChild(createToolbar());

  // Ensure timestamps button starts in correct state
  const timestampsButton = document.getElementById('timestamps-button');
  if (timestampsButton) {
    if (!showTimestamps) {
      timestampsButton.classList.add('active');
    } else {
      timestampsButton.classList.remove('active');
    }
  }

  // Ensure warnings button starts in correct state
  const warningsButton = document.getElementById('warnings-button');
  if (warningsButton) {
    if (!showWarnings) {
      warningsButton.classList.add('active');
      warningsButton.textContent = 'Show Warnings';
    } else {
      warningsButton.classList.remove('active');
      warningsButton.textContent = 'Hide Warnings';
    }
  }
}

export function setViewerPage() {
  setLivePage(); // Reuse the same UI for now with minor modifications

  // Add file input control for loading logs
  const toolbar = document.getElementById('toolbar');
  if (toolbar) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'log-file-input';
    fileInput.accept = '.json';
    fileInput.className = 'file-input';
    fileInput.addEventListener('change', handleFileSelect, false);

    const fileLabel = document.createElement('label');
    fileLabel.htmlFor = 'log-file-input';
    fileLabel.textContent = 'Load Log File';
    fileLabel.className = 'toolbar-button';

    toolbar.insertBefore(fileLabel, toolbar.firstChild);
    toolbar.insertBefore(fileInput, toolbar.firstChild);

    // Hide reconnect button in viewer mode
    const reconnectButton = document.getElementById('reconnect-button');
    if (reconnectButton) {
      reconnectButton.style.display = 'none';
    }

    // Hide team number input in viewer mode
    const teamNumberContainer = document.querySelector('.team-number-container') as HTMLElement;
    if (teamNumberContainer) {
      teamNumberContainer.style.display = 'none';
    }
  }
}

function handleFileSelect(evt: Event) {
  const files = (evt.target as HTMLInputElement).files!;
  const firstFile = files[0];
  const reader = new FileReader();
  reader.onload = (loaded: Event) => {
    const target: FileReader = loaded.target as FileReader;
    try {
      const parsed = JSON.parse(target.result as string) as (IPrintMessage | IErrorMessage)[];

      // Clear existing logs first
      onClear();

      // Add all logs from the file
      for (const p of parsed) {
        addMessage(p);
      }
    } catch (error) {
      console.error('Error parsing log file:', error);

      // Show error message in the log
      const errorMessage: IErrorMessage = {
        callStack: '',
        details: 'Failed to parse log file: ' + (error as Error).message,
        errorCode: 0,
        flags: 1,
        location: '',
        messageType: MessageType.Error,
        numOccur: 1,
        seqNumber: 0,
        timestamp: Date.now() / 1000
      };
      addMessage(errorMessage);
    }
  };
  reader.readAsText(firstFile);
}

// Initialize the page when loaded
window.addEventListener('load', () => {
  setLivePage();
});
