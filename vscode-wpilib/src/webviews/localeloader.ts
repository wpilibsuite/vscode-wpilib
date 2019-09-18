// many `any` used in locale functions, disabled for whole file
// tslint:disable:no-any

import format from '../formatter';

interface ITranslationMap {
  [text: string]: string;
}

const localeDomains: {
  [domain: string]: ITranslationMap;
} = {};

window.addEventListener('load', () => {
  document.querySelectorAll('[data-locale]').forEach((e: Element) => {
    const domainAttr = e.attributes.getNamedItem('data-domain');
    if (!domainAttr) {
      console.log('failed to process ', e);
      return;
    }
    localeDomains[domainAttr.value] = JSON.parse(e.innerHTML) as ITranslationMap;
  });
});

(window as any).i18nTrans = (domain: string, message: string, ...args: any[]) => {
  if (localeDomains[domain] && localeDomains[domain][message]) {
    message = localeDomains[domain][message];
  }
  return format(message, args);
};
(window as any).__I18N_LOCALE_DOMAINS = localeDomains;
