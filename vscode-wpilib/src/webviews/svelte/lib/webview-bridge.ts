import { postMessage, subscribeToMessages } from './vscode-api';

export function signalLoaded(): void {
  postMessage({ type: 'loaded' });
}

export function onWebviewMessage<TMessage>(handler: (message: TMessage) => void): () => void {
  return subscribeToMessages<TMessage>((message) => handler(message));
}
