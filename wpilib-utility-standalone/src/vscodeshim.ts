'use strict';

export interface QuickPickItem {
  label: string;
  description: string;
}

export class Uri {
  public static file(path: string): Uri {
    return new Uri(path);
  }

  public readonly fsPath: string;
  private constructor(path: string) {
    this.fsPath = path;
  }
}

export namespace window {
  export function showErrorMessage(_message: string) {
    // TODO
  }
}

export interface ExtensionContext {
  storagePath: string | undefined;
}

export function b() {
  //
}
