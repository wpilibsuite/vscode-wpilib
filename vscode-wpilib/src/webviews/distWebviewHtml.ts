import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

type DistHtmlOptions = {
  webview: vscode.Webview;
  extensionRoot: vscode.Uri;
  distHtmlFileName: string;
  extraCss?: vscode.Uri[];
};

type RewriteHtmlOptions = {
  webview: vscode.Webview;
  extensionRoot: vscode.Uri;
  html: string;
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

export function rewriteDistWebviewHtml(options: RewriteHtmlOptions): string {
  const distRootFsPath = path.join(options.extensionRoot.fsPath, 'resources', 'dist');
  let html = options.html;

  html = rewriteDistScriptTags(html, options.webview, distRootFsPath);

  const extensionRootUri = options.webview.asWebviewUri(options.extensionRoot).toString();
  html = rewriteReplaceresourceBase(html, extensionRootUri);

  if (options.extraCss && options.extraCss.length > 0) {
    const cssLinks = options.extraCss
      .map(
        (uri) => `<link rel="stylesheet" href="${options.webview.asWebviewUri(uri).toString()}">`
      )
      .join('\n');
    html = insertBeforeHeadClose(html, cssLinks);
  }

  return html;
}

export function loadDistWebviewHtml(options: DistHtmlOptions): string {
  const distRootFsPath = path.join(options.extensionRoot.fsPath, 'resources', 'dist');
  const htmlPath = path.join(distRootFsPath, options.distHtmlFileName);
  const html = fs.readFileSync(htmlPath, 'utf8');
  return rewriteDistWebviewHtml({
    webview: options.webview,
    extensionRoot: options.extensionRoot,
    html,
    extraCss: options.extraCss,
  });
}
