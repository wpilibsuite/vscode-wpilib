import * as vscode from 'vscode';
import * as glob from 'glob';
import * as path from 'path';
import { CppGradleProperties } from './cpp_gradle_properties';

function getFilesInDirectory(root: string) : Promise<string[]> {
  return new Promise(function (resolve, _) {
      glob('**/*.h', { nomount: true,  cwd: root},  (error: Error | null, result : string[]) => {
          if (error) {
              resolve([]);
          } else {
              resolve(result);
          }
      });
  });
}

export class WpiLibHeaders {
  private libraryHeaderFiles: string[] = [];
  private gradleProperties: CppGradleProperties;
  private localHeaderFiles: string[] = [];
  private disposables: vscode.Disposable[] = [];
  private currentlyLoadingLibrary: boolean = false;
  private currentlyLoadingLocal: boolean = false;

  public constructor(wp: vscode.WorkspaceFolder, gp: CppGradleProperties) {
    let currentThis = this;
    this.gradleProperties = gp;

    this.gradleProperties.onDidChangeLibraryHeaderDirectories((paths) => {
      this.loadLibraryHeaders(paths);
    });

    this.gradleProperties.onDidChangeLocalHeaderDirectories((paths) => {
      this.loadLocalHeaders(paths);
    })

    let completionProvider = vscode.languages.registerCompletionItemProvider(['cpp', 'c'], {
      async provideCompletionItems(document, position) {
        if (document.lineAt(position.line).text.indexOf('#include') === -1) {
            return null;
        }
        return await currentThis.getHeaders(document);
      }
    }, '<', '\"');

    this.disposables.push(completionProvider);
  }

  public async getHeaders(document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
    let locs = new Array<vscode.CompletionItem>();
    let srcRoot = path.dirname(document.uri.fsPath);
    let headerPattern = new vscode.RelativePattern(srcRoot, '**/*.{h, hpp, hh}');
    let findHeaders = await vscode.workspace.findFiles(headerPattern);
    let headers: Set<string> = new Set<string>();
    for (let f of findHeaders) {
      if (f.fsPath === document.uri.fsPath) {
        continue;
      }
      let normalizedSrc = path.normalize(srcRoot);
      let normalizedHeader = path.normalize(f.fsPath);

      let headerLoc = normalizedHeader.replace(normalizedSrc, '').replace(/\\/g, '/');
      headers.add(headerLoc.substring(1));
    }

    for (let p of this.localHeaderFiles) {
      headers.add(p);
    }

    for (let p of headers) {
      locs.push(new vscode.CompletionItem(p));
    }

    for (let p of this.libraryHeaderFiles) {
        locs.push(new vscode.CompletionItem(p));
    }
    return locs;
  }

  public loadLocalHeaders(paths: string[]) {
    if (this.currentlyLoadingLocal) {
      return;
    }
    this.currentlyLoadingLocal = true;

    let awaiters: Array<Promise<string[]>> = [];

    for (let p of paths) {
      p = path.normalize(p);
      awaiters.push(getFilesInDirectory(p));
    }

    Promise.all(awaiters).then((files) => {
      var allFiles: string[] = [].concat.apply([], files);
      this.localHeaderFiles = allFiles;
      this.currentlyLoadingLocal = false;
    });
  }

  public loadLibraryHeaders(paths: string[]) {
    if (this.currentlyLoadingLibrary) {
      return;
    }
    this.currentlyLoadingLibrary = true;

    let awaiters: Array<Promise<string[]>> = [];

    for (let p of paths) {
      p = path.normalize(p);
      awaiters.push(getFilesInDirectory(p));
    }

    Promise.all(awaiters).then((files) => {
      var allFiles: string[] = [].concat.apply([], files);
      this.libraryHeaderFiles = allFiles;
      this.currentlyLoadingLibrary = false;
    });
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
