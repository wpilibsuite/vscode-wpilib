// many `any` used in locale functions, disabled for whole file
// tslint:disable:no-any

import format from '../formatter';

interface ITranslationMap {
  [text: string]: string;
}

const localeDomains: {
  [domain: string]: ITranslationMap;
} = {};

function localize(domain: string, message: string, ...args: any[]) {
  if (localeDomains[domain] && localeDomains[domain][message]) {
    message = localeDomains[domain][message];
  }
  return format(message, args);
}

window.addEventListener('load', () => {
  document.querySelectorAll('[data-locale]').forEach((e: Element) => {
    const domainAttr = e.attributes.getNamedItem('data-domain');
    if (!domainAttr) {
      console.log('failed to process ', e);
      return;
    }
    localeDomains[domainAttr.value] = JSON.parse(e.innerHTML) as ITranslationMap;
  });
  document.querySelectorAll('[data-i18n-trans]').forEach((e: Element) => {
    const domainAttr = e.attributes.getNamedItem('data-i18n-trans');
    if (!domainAttr || !e.textContent) {
      return;
    }
    e.textContent = localize(domainAttr.value, e.textContent);
  });
});

(window as any).i18nTrans = localize;
(window as any).__I18N_LOCALE_DOMAINS = localeDomains;
