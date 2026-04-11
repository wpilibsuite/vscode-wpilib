interface VsCodeApi {
  postMessage: (message: unknown) => void;
  setState: <T>(state: T) => void;
  getState: <T>() => T | undefined;
}

declare function acquireVsCodeApi(): VsCodeApi;
