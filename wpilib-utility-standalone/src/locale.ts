console.warn('[Locale] Not implemented!');

export function localize(_domain: string, message: string | string[], ..._args: unknown[]) {
  if (typeof message === "string") {
    return message;
  } else if (message.length === 2) {
    return message[1];
  } else {
    throw new Error('Invalid message');
  }
}
