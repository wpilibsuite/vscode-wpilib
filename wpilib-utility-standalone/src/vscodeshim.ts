'use strict';

// tslint:disable-next-line:interface-name
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

// tslint:disable-next-line:no-namespace
export namespace window {
  export function showErrorMessage(_message: string) {
    // TODO
  }
}

// tslint:disable-next-line:interface-name
export interface ExtensionContext {
  storagePath: string | undefined;
}

export function b() {
  //
}
