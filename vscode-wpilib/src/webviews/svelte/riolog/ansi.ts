import type { AnsiState } from '../../../riolog/ansi/ansiparser';

export function ansiStateToStyle(state: AnsiState): string {
  const styles: string[] = [];
  if (state.foreground) {
    styles.push(`color: ${state.foreground}`);
  }
  if (state.background) {
    styles.push(`background-color: ${state.background}`);
  }
  if (state.bold) {
    styles.push('font-weight: bold');
  }
  if (state.dim) {
    styles.push('opacity: 0.7');
  }
  if (state.italic) {
    styles.push('font-style: italic');
  }

  const decorations: string[] = [];
  if (state.underline) {
    decorations.push('underline');
  }
  if (state.strikethrough) {
    decorations.push('line-through');
  }
  if (decorations.length > 0) {
    styles.push(`text-decoration: ${decorations.join(' ')}`);
  }

  return styles.join('; ');
}
