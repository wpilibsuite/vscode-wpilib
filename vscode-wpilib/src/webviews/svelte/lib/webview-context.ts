export type WebviewAppElement = HTMLElement & {
  dataset: DOMStringMap & {
    resourceBase?: string;
    viewMode?: string;
  };
};

export function getWebviewAppElement(): WebviewAppElement | null {
  const element = document.getElementById('app');
  return element as WebviewAppElement | null;
}

export function getResourceBase(): string {
  return getWebviewAppElement()?.dataset.resourceBase ?? '';
}

export function getViewMode(defaultMode = 'ready'): string {
  return getWebviewAppElement()?.dataset.viewMode ?? defaultMode;
}

