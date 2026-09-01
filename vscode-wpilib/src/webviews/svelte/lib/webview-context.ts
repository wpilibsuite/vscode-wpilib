export function getResourceBase(): string {
  return document.getElementById('app')?.dataset.resourceBase ?? '';
}
