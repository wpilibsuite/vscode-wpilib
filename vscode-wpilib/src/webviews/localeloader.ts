import format from '../formatter';

interface ITranslationMap {
  [text: string]: string;
}

const localeDomains: {
  [domain: string]: ITranslationMap;
} = {};
let defaultDomain: string;

function localize(domain: string, message: string | string[], ...args: unknown[]) {
  let key: string;
  if (typeof message == "string") {
    key = message;
  } else if (message.length === 2) {
    key = message[0];
    message = message[1];
  } else {
    throw new Error('Invalid message');
  }
  if (localeDomains[domain] && localeDomains[domain][key]) {
    message = localeDomains[domain][key];
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
    /* eslint-disable no-extra-boolean-cast */
    if (!!e.attributes.getNamedItem('data-default-domain')) {
      defaultDomain = domain;
    }

    localeDomains[domain] = JSON.parse(e.innerHTML) as ITranslationMap;
  });

  // auto translate `textContent`
  document.querySelectorAll('[data-i18n-trans]').forEach((e: Element) => {
    const domainAttr = e.attributes.getNamedItem('data-i18n-trans');
    const keyAttr = e.attributes.getNamedItem('data-i18n-key');
    if (!domainAttr || !e.textContent) {
      return;
    }
    let message: string | string[] = e.textContent;
    if (!!keyAttr && keyAttr.value !== '') {
      message = [keyAttr.value, message];
    }
    const domain = domainAttr.value === '' ? defaultDomain : domainAttr.value;
    e.textContent = localize(domain, message);
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
(window as any).i18nTrans = localize;
/* eslint-disable @typescript-eslint/no-explicit-any */
(window as any).__I18N_LOCALE_DOMAINS = localeDomains;
