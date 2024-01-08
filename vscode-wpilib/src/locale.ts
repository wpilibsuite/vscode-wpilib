/* `vscode-nls` is really hard to use, so we implement i18n here. */

import * as fs from 'fs';
import * as path from 'path';
import format from './formatter';
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

const localeCache: {
  [domain: string]: { [text: string]: string };
} = {};

let options: {
  locale: string | undefined;
  language: string | undefined;
  languagePackSupport: boolean;
  languagePackId?: string;
};

function readJsonFileSync<T = unknown>(filename: string): T {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as T;
}

function initializeSettings() {
  options = { locale: undefined, language: undefined, languagePackSupport: false };
  if (typeof process.env.VSCODE_NLS_CONFIG === 'string') {
    try {
      const vscodeOptions = JSON.parse(process.env.VSCODE_NLS_CONFIG) as IVSCodeNlsConfig;
      let language: string | undefined;
      if (vscodeOptions.availableLanguages) {
        const value = vscodeOptions.availableLanguages['*'];
        if (typeof value == 'string') {
          language = value;
        }
      }
      if (typeof vscodeOptions.locale === 'string') {
        options.locale = vscodeOptions.locale.toLowerCase();
      }
      if (language === undefined) {
        options.language = options.locale;
      } else if (language !== 'en') {
        options.language = language;
      }

      if (typeof vscodeOptions._languagePackSupport === 'boolean') {
        options.languagePackSupport = vscodeOptions._languagePackSupport;
      }
      if (typeof vscodeOptions._languagePackId === 'string') {
        options.languagePackId = vscodeOptions._languagePackId;
      }
    } catch {
      // Do nothing.
    }
  }
  logger.info('[Locale] initialized.');
}
initializeSettings();

export function getLocaleFilePath(domain: string) {
  let rootPath: string;
  // get extension path for getting locale files
  if (extensionContext !== undefined) {
    rootPath = extensionContext.extensionPath;
  } else {
    logger.error(`[Locale] Failed to get extension context.`);
    return undefined;
  }
  const lang = options.language || 'en';
  return path.resolve(rootPath, `./i18n/${lang.toLowerCase()}/${domain}.json`);
}

export function loadLocaleFile(domain: string) {
  if (typeof localeCache[domain] !== 'undefined') {
    logger.log(`[Locale] ${domain}@${options.language} is already loaded, using cached one.`);
    return localeCache[domain];
  }
  logger.log(`[Locale] Loading ${domain}@${options.language}`);
  let filePath = getLocaleFilePath(domain);
  if (!filePath) {
    filePath = path.resolve(__dirname, '../');
  }
  try {
    localeCache[domain] = readJsonFileSync(filePath);
    logger.log(`[Locale] Loaded ${domain}@${options.language}`);
  } catch (e) {
    localeCache[domain] = {}; // suppress errors when finding messages in non-existence domain
    if (domain !== 'en-us') {
      logger.error(`[Locale] Failed to load ${domain}@${options.language}.`, e);
    }
  }
  return localeCache[domain];
}

/**
 * When `message` takes an array, it will be treated as [translationKey, fallbackMessage]
 */
export function localize(domain: string, message: string | string[], ...args: unknown[]) {
  if (!(typeof localeCache[domain] !== 'undefined')) {
    loadLocaleFile(domain);
  }
  let key: string;
  if (typeof message === 'string') {
    key = message;
  } else if (message.length === 2) {
    key = message[0];
    message = message[1];
  } else {
    throw new Error('Invalid message');
  }
  if (typeof localeCache[domain][key] !== 'undefined') {
    message = localeCache[domain][key];
  }
  return format(message, args);
}
