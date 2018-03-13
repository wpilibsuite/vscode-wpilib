import * as vscode from 'vscode';
import * as glob from 'glob';
import * as path from 'path';
import { CppGradleProperties } from './cpp_gradle_properties';

function getFilesInDirectory(root: string) : Promise<string[]> {
  return new Promise(function (resolve, _) {
      glob('**/*.{h, hpp, hh}', { nomount: true,  cwd: root},  (error: Error | null, result : string[]) => {
          if (error) {
              resolve([]);
          } else {
              resolve(result);
          }
      });
  });
}

class WPILibCompletionItemProvider implements vscode.CompletionItemProvider {
  private headers: WpiLibHeaders;

  constructor(headers: WpiLibHeaders) {
    this.headers = headers;
  }


  public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _: vscode.CancellationToken, __: vscode.CompletionContext): Promise<vscode.CompletionItem[]> | undefined {
    if (document.lineAt(position.line).text.indexOf('#include') === -1) {
      return undefined;
  }
  return this.headers.getHeaders(document);
  }
}

export class WpiLibHeaders {
  private libraryHeaderFiles: string[] = [];
  private gradleProperties: CppGradleProperties;
  private localHeaderFiles: string[] = [];
  private disposables: vscode.Disposable[] = [];
  private currentlyLoadingLibrary: boolean = false;
  private currentlyLoadingLocal: boolean = false;

  public constructor(gp: CppGradleProperties) {
    this.gradleProperties = gp;

    this.gradleProperties.onDidChangeLibraryHeaderDirectories((paths) => {
      this.loadLibraryHeaders(paths);
    });

    this.gradleProperties.onDidChangeLocalHeaderDirectories((paths) => {
      this.loadLocalHeaders(paths);
    });

    this.loadLibraryHeaders(gp.getLibraryHeaders());
    this.loadLocalHeaders(gp.getLocalHeaders());

    const completionItemProvider = new WPILibCompletionItemProvider(this);

    const completionProvider = vscode.languages.registerCompletionItemProvider(['cpp', 'c'], completionItemProvider, '<', '\"');

    this.disposables.push(completionProvider);
  }

  public async getHeaders(document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
    const locs = new Array<vscode.CompletionItem>();
    const srcRoot = path.dirname(document.uri.fsPath);
    const headerPattern = new vscode.RelativePattern(srcRoot, '**/*.{h, hpp, hh}');
    const findHeaders = await vscode.workspace.findFiles(headerPattern);
    const headers: Set<string> = new Set<string>();
    for (const f of findHeaders) {
      if (f.fsPath === document.uri.fsPath) {
        continue;
      }
      const normalizedSrc = path.normalize(srcRoot);
      const normalizedHeader = path.normalize(f.fsPath);

      const headerLoc = normalizedHeader.replace(normalizedSrc, '').replace(/\\/g, '/');
      headers.add(headerLoc.substring(1));
    }

    for (const p of this.localHeaderFiles) {
      headers.add(p);
    }

    for (const p of headers) {
      const ci = new vscode.CompletionItem(p);
      ci.documentation = p;
      locs.push(ci);
    }

    for (const p of this.libraryHeaderFiles) {
      const ci = new vscode.CompletionItem(p);
      ci.documentation = p;
      locs.push(ci);
    }
    return locs;
  }

  public loadLocalHeaders(paths: string[]) {
    if (this.currentlyLoadingLocal) {
      return;
    }
    this.currentlyLoadingLocal = true;

    const awaiters: Array<Promise<string[]>> = [];

    for (let p of paths) {
      p = path.normalize(p);
      awaiters.push(getFilesInDirectory(p));
    }

    Promise.all(awaiters).then((files) => {
      const allFiles: string[] = [].concat.apply([], files);
      this.localHeaderFiles = allFiles;
      this.currentlyLoadingLocal = false;
    });
  }

  public loadLibraryHeaders(paths: string[]) {
    if (this.currentlyLoadingLibrary) {
      return;
    }
    this.currentlyLoadingLibrary = true;

    const awaiters: Array<Promise<string[]>> = [];

    for (let p of paths) {
      p = path.normalize(p);
      awaiters.push(getFilesInDirectory(p));
    }

    Promise.all(awaiters).then((files) => {
      const allFiles: string[] = [].concat.apply([], files);
      this.libraryHeaderFiles = allFiles;
      this.currentlyLoadingLibrary = false;
    });
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
