export default function format(message: string, args: unknown[]): string {
  let result: string;

  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match: string, rest: number[]) => {
      const index = rest[0];
      const arg = args[index];
      let replacement = match;
      if (typeof arg === 'string') {
        replacement = arg;
      } else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
        replacement = String(arg);
      }
      return replacement;
    });
  }
  return result;
}
