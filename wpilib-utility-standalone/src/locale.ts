// tslint:disable:no-any

console.warn('[Locale] Not implemented!');

function isString(value: any): value is string {
  return toString.call(value) === '[object String]';
}

export function localize(_domain: string, message: string | string[], ..._args: any[]) {
  if (isString(message)) {
    return message;
  } else if (message.length === 2) {
    return message[1];
  } else {
    throw new Error('Invalid message');
  }
}
