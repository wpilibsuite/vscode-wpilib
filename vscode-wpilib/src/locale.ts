/* `vscode-nls` is really hard to use, so we implement i18n here. */

// many `any` used in locale functions, disabled for whole file
// tslint:disable:no-any

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { extensionContext } from './utilities';

interface IVSCodeNlsConfig {
  locale: string;
  availableLanguages: {
    [pack: string]: string;
  };
  _languagePackSupport?: boolean;
  _languagePackId?: string;
  _translationsConfigFile?: string;
  _cacheRoot?: string;
  _corruptedFile: string;
}

// tslint:disable-next-line:prefer-const
let localeCache: {
  [domain: string]: { [text: string]: string };
} = {};

let options: {
  locale: string | undefined;
  language: string | undefined;
  languagePackSupport: boolean;
  languagePackId?: string;
};

function isString(value: any): value is string {
  return toString.call(value) === '[object String]';
}
function isBoolean(value: any): value is boolean {
  return value === true || value === false;
}
function isDefined(value: any): boolean {
  return typeof value !== 'undefined';
}

function readJsonFileSync<T = any>(filename: string): T {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as T;
}

function initializeSettings() {
  options = { locale: undefined, language: undefined, languagePackSupport: false };
  if (isString(process.env.VSCODE_NLS_CONFIG)) {
    try {
      const vscodeOptions = JSON.parse(process.env.VSCODE_NLS_CONFIG) as IVSCodeNlsConfig;
      let language: string | undefined;
      if (vscodeOptions.availableLanguages) {
        const value = vscodeOptions.availableLanguages['*'];
        if (isString(value)) {
          language = value;
        }
      }
      if (isString(vscodeOptions.locale)) {
        options.locale = vscodeOptions.locale.toLowerCase();
      }
      if (language === undefined) {
        options.language = options.locale;
      } else if (language !== 'en') {
        options.language = language;
      }

      if (isBoolean(vscodeOptions._languagePackSupport)) {
        options.languagePackSupport = vscodeOptions._languagePackSupport;
      }
      if (isString(vscodeOptions._languagePackId)) {
        options.languagePackId = vscodeOptions._languagePackId;
      }
    } catch {
      // Do nothing.
    }
  }
  logger.info('[Locale] initialized.');
}
initializeSettings();

function format(message: string, args: any[]): string {
  let result: string;

  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match: string, rest: number[]) => {
      const index = rest[0];
      const arg = args[index];
      let replacement = match;
      if (typeof arg === 'string') {
        replacement = arg;
      } else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
        replacement = String(arg);
      }
      return replacement;
    });
  }
  return result;
}

function loadLocaleFile(domain: string) {
  // get extension path for getting locale files
  let rootPath = path.resolve(__dirname, '../');
  if (extensionContext !== undefined) {
    rootPath = extensionContext.extensionPath;
  } else {
    logger.error(`[Locale] Failed to get extension context.`);
  }

  logger.log(`[Locale] Loading ${domain}@${options.language}`);
  const domainLocalePath = path.resolve(rootPath, `./i18n/${options.language}/${domain}.json`);
  try {
    localeCache[domain] = readJsonFileSync(domainLocalePath);
    logger.log(`[Locale] Loaded ${domain}@${options.language}`);
  } catch (e) {
    localeCache[domain] = {}; // suppress errors when finding messages in non-existence domain
    logger.error(`[Locale] Failed to load ${domain}@${options.language}.`, e);
  }
}

export function localize(domain: string, message: string, ...args: any[]) {
  if (!isDefined(localeCache[domain])) {
    loadLocaleFile(domain);
  }
  if (isDefined(localeCache[domain][message])) {
    message = localeCache[domain][message];
  }
  return format(message, args);
}
