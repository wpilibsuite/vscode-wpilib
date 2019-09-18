// many `any` used in locale functions, disabled for whole file
// tslint:disable:no-any

import format from '../formatter';

interface ITranslationMap {
  [text: string]: string;
}

const localeDomains: {
  [domain: string]: ITranslationMap;
} = {};
let defaultDomain: string;

function localize(domain: string, message: string, ...args: any[]) {
  if (localeDomains[domain] && localeDomains[domain][message]) {
    message = localeDomains[domain][message];
  }
  return format(message, args);
}

window.addEventListener('load', () => {
  // Loads locale translations
  document.querySelectorAll('[data-locale]').forEach((e: Element) => {
    const domainAttr = e.attributes.getNamedItem('data-domain');
    if (!domainAttr) {
      console.log('failed to process ', e);
      return;
    }
    const domain = domainAttr.value;
    if (!!e.attributes.getNamedItem('data-default-domain')) {
      defaultDomain = domain;
    }

    localeDomains[domain] = JSON.parse(e.innerHTML) as ITranslationMap;
  });

  // auto translate `textContent`
  document.querySelectorAll('[data-i18n-trans]').forEach((e: Element) => {
    const domainAttr = e.attributes.getNamedItem('data-i18n-trans');
    if (!domainAttr || !e.textContent) {
      return;
    }
    const domain = domainAttr.value === '' ? defaultDomain : domainAttr.value;
    e.textContent = localize(domain, e.textContent);
  });
});

(window as any).i18nTrans = localize;
(window as any).__I18N_LOCALE_DOMAINS = localeDomains;
