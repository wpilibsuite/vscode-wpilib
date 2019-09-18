/* `vscode-nls` is really hard to use, so we implement i18n here. */
import * as fs from 'fs';
import { logger } from './logger';

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

let options: {
    locale: string | undefined;
    language: string | undefined;
    languagePackSupport: boolean;
    languagePackId?: string;
};
let isPseudo: boolean;

// tslint:disable-next-line:no-any
function isString(value: any): value is string {
    return toString.call(value) === '[object String]';
}
// tslint:disable-next-line:no-any
function isBoolean(value: any): value is boolean {
    return value === true || value === false;
}

// tslint:disable-next-line:no-any
function readJsonFileSync<T = any>(filename: string): T {
    return JSON.parse(fs.readFileSync(filename, 'utf8')) as T;
}

function initializeSettings() {
    options = { locale: undefined, language: undefined, languagePackSupport: false };
    logger.log(process.env.VSCODE_NLS_CONFIG as string);
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
    logger.log('Locale initialized.');
    isPseudo = options.locale === 'pseudo';
}
initializeSettings();

// tslint:disable-next-line:no-any
export function localize(_message: string, ..._args: any[]) {
    return;
}
