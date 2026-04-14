import { readable } from 'svelte/store';
import formatMessage from '../../../formatter';

type MessageInput = string | [string, string];
type LocaleDomains = Record<string, Record<string, string>>;

let parsedDomains: LocaleDomains | null = null;
let defaultLocaleDomain = '';

function initializeLocales(): LocaleDomains {
  if (parsedDomains) {
    return parsedDomains;
  }
  parsedDomains = {};

  document.querySelectorAll<HTMLScriptElement>('script[data-locale]').forEach((element) => {
    const domain = element.dataset.domain!;
    if (element.hasAttribute('data-default-domain')) {
      defaultLocaleDomain = domain;
    }
    parsedDomains![domain] = JSON.parse(element.textContent ?? '{}') as Record<string, string>;
  });

  return parsedDomains;
}

export function translate(domain: string, message: MessageInput, ...args: unknown[]): string {
  const domains = initializeLocales();
  const [key, defaultText] = typeof message === 'string' ? [message, message] : message;

  const targetDomain = domain === '' ? defaultLocaleDomain : domain;
  const localized = domains[targetDomain]?.[key] ?? defaultText;

  return formatMessage(localized, args);
}

export function createTranslator(defaultDomain: string) {
  return (message: MessageInput, ...args: unknown[]) => translate(defaultDomain, message, ...args);
}

export const localeDomainsStore = readable<LocaleDomains>({}, (set) => {
  set(initializeLocales());
  return () => undefined;
});

export function getLocaleDomains(): LocaleDomains {
  return initializeLocales();
}
