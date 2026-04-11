export function onWebviewMessage<TMessage>(handler: (message: TMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    handler(event.data as TMessage);
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
