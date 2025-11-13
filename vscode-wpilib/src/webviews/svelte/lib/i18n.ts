import { readable } from 'svelte/store';

type MessageInput = string | [string, string];

type LocaleDomains = Record<string, Record<string, string>>;

declare global {
  interface Window {
    i18nTrans: (domain: string, message: string, ...args: unknown[]) => string;
    __I18N_LOCALE_DOMAINS?: LocaleDomains;
  }
}

const formatMessage = (message: string, args: unknown[]): string => {
  return message.replace(/\{(\d+)\}/g, (match, index) => {
    const argIndex = Number.parseInt(index, 10);
    return argIndex >= 0 && argIndex < args.length ? String(args[argIndex]) : match;
  });
};

const fallbackLocalize = (domain: string, message: MessageInput, ...args: unknown[]): string => {
  const [key, defaultText] = typeof message === 'string' ? [message, message] : message;
  const localized = window.__I18N_LOCALE_DOMAINS?.[domain]?.[key] ?? defaultText;
  return formatMessage(localized, args);
};

export function translate(domain: string, message: MessageInput, ...args: unknown[]): string {
  if (typeof window !== 'undefined' && typeof window.i18nTrans === 'function') {
    const [key] = typeof message === 'string' ? [message] : message;
    return window.i18nTrans(domain, key, ...args);
  }

  return fallbackLocalize(domain, message, ...args);
}

export function createTranslator(defaultDomain: string) {
  return (message: MessageInput, ...args: unknown[]) => translate(defaultDomain, message, ...args);
}

export const localeDomainsStore = readable<LocaleDomains>({}, (set) => {
  if (typeof window !== 'undefined') {
    set(window.__I18N_LOCALE_DOMAINS ?? {});
  }

  return () => undefined;
});

export function getLocaleDomains(): LocaleDomains {
  if (typeof window !== 'undefined' && window.__I18N_LOCALE_DOMAINS) {
    return window.__I18N_LOCALE_DOMAINS;
  }
  return {};
}

