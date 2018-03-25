import * as vscode from 'vscode';
import * as ncp from 'ncp';
import * as path from 'path';

function promisifyNcp(source: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ncp.ncp(source, dest, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

export async function generateCopy(fromTemplateFolder: vscode.Uri, fromGradleFolder: vscode.Uri, toFolder: vscode.Uri): Promise<void> {
  await promisifyNcp(fromTemplateFolder.fsPath, path.join(toFolder.fsPath, 'src'));
  await promisifyNcp(fromGradleFolder.fsPath, toFolder.fsPath);
}
