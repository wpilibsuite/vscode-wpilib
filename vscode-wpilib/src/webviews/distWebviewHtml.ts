import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

type DistHtmlOptions = {
  webview: vscode.Webview;
  extensionRoot: vscode.Uri;
  extraCss?: vscode.Uri[];
};

function insertBeforeHeadClose(html: string, insert: string): string {
  if (!insert) {
    return html;
  }
  if (html.includes('</head>')) {
    return html.replace('</head>', `${insert}\n</head>`);
  }
  return `${insert}\n${html}`;
}

function rewriteReplaceresourceBase(html: string, extensionRootUri: string): string {
  return html.replace(/replaceresource/g, extensionRootUri);
}

function rewriteDistScriptTags(
  html: string,
  webview: vscode.Webview,
  distRootFsPath: string
): string {
  return html.replace(
    /<script\s+(?:type="module"\s+)?src="replaceresource\/dist\/([^"]+)"><\/script>/g,
    (_match, fileName: string) => {
      const uri = webview.asWebviewUri(vscode.Uri.file(path.join(distRootFsPath, fileName)));
      return `<script type="module" src="${uri.toString()}"></script>`;
    }
  );
}

export function rewriteDistWebviewHtml(options: DistHtmlOptions, html: string): string {
  const distRootFsPath = path.join(options.extensionRoot.fsPath, 'resources', 'dist');
  let rewritten = html;

  rewritten = rewriteDistScriptTags(rewritten, options.webview, distRootFsPath);

  const extensionRootUri = options.webview.asWebviewUri(options.extensionRoot).toString();
  rewritten = rewriteReplaceresourceBase(rewritten, extensionRootUri);

  if (options.extraCss && options.extraCss.length > 0) {
    const cssLinks = options.extraCss
      .map(
        (uri) => `<link rel="stylesheet" href="${options.webview.asWebviewUri(uri).toString()}">`
      )
      .join('\n');
    rewritten = insertBeforeHeadClose(rewritten, cssLinks);
  }

  return rewritten;
}

export function loadDistWebviewHtml(options: DistHtmlOptions, distHtmlFileName: string): string {
  const distRootFsPath = path.join(options.extensionRoot.fsPath, 'resources', 'dist');
  const html = fs.readFileSync(path.join(distRootFsPath, distHtmlFileName), 'utf8');
  return rewriteDistWebviewHtml(options, html);
}
