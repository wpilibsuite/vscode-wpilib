export function formatRioLogTimestamp(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toISOString().slice(11, -1) + ': ';
}

