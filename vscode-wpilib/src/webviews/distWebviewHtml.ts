import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

type DistHtmlOptions = {
  webview: vscode.Webview;
  extensionRoot: vscode.Uri;
  distHtmlFileName: string;
  extraCss?: vscode.Uri[];
  appAttributes?: Record<string, string>;
};

type RewriteHtmlOptions = {
  webview: vscode.Webview;
  extensionRoot: vscode.Uri;
  html: string;
  extraCss?: vscode.Uri[];
  appAttributes?: Record<string, string>;
  ensureLocaleloader?: boolean;
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

function insertBeforeBodyClose(html: string, insert: string): string {
  if (!insert) {
    return html;
  }
  if (html.includes('</body>')) {
    return html.replace('</body>', `${insert}\n</body>`);
  }
  return `${html}\n${insert}\n`;
}

function patchAppAttributes(html: string, attributes: Record<string, string>): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return html;
  }

  // Prefer the known rollup template shape.
  const appDivPattern = /<div\s+id="app"([^>]*)>/i;
  const match = html.match(appDivPattern);
  if (!match) {
    return html;
  }

  const existingAttrs = match[1] ?? '';
  const toInject = Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${escapeHtmlAttribute(value)}"`)
    .join('');

  return html.replace(appDivPattern, `<div id="app"${existingAttrs}${toInject}>`);
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    /<script\s+src="replaceresource\/dist\/([^"]+)"><\/script>/g,
    (_match, fileName: string) => {
      const uri = webview.asWebviewUri(vscode.Uri.file(path.join(distRootFsPath, fileName)));
      return `<script src="${uri.toString()}"></script>`;
    }
  );
}

function ensureScriptIncluded(
  html: string,
  webview: vscode.Webview,
  distRootFsPath: string,
  scriptFileName: string
): string {
  if (html.includes(scriptFileName)) {
    return html;
  }
  const uri = webview.asWebviewUri(vscode.Uri.file(path.join(distRootFsPath, scriptFileName)));
  return insertBeforeBodyClose(html, `<script src="${uri.toString()}"></script>`);
}

export function rewriteDistWebviewHtml(options: RewriteHtmlOptions): string {
  const distRootFsPath = path.join(options.extensionRoot.fsPath, 'resources', 'dist');
  let html = options.html;

  html = patchAppAttributes(html, options.appAttributes ?? {});

  html = rewriteDistScriptTags(html, options.webview, distRootFsPath);
  if (options.ensureLocaleloader !== false) {
    html = ensureScriptIncluded(html, options.webview, distRootFsPath, 'localeloader.js');
  }

  const extensionRootUri = options.webview.asWebviewUri(options.extensionRoot).toString();
  html = rewriteReplaceresourceBase(html, extensionRootUri);

  if (options.extraCss && options.extraCss.length > 0) {
    const cssLinks = options.extraCss
      .map((uri) => `<link rel="stylesheet" href="${options.webview.asWebviewUri(uri).toString()}">`)
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
    appAttributes: options.appAttributes,
  });
}
