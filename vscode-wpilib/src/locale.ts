/* `vscode-nls` is really hard to use, so we implement i18n here. */

// many `any` used in locale functions, disabled for whole file
// tslint:disable:no-any

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
  if (isDefined(localeCache[domain])) {
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
    logger.error(`[Locale] Failed to load ${domain}@${options.language}.`, e);
  }
  return localeCache[domain];
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
