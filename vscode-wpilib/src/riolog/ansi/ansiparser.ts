'use strict';

// ANSI color codes
export interface AnsiState {
  foreground?: string;
  background?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
}

// Color mapping for standard ANSI colors
const foregroundColors: {[key: number]: string} = {
  30: '#000000',  // black
  31: '#f44336',  // red
  32: '#4caf50',  // green
  33: '#ffeb3b',  // yellow
  34: '#2196f3',  // blue
  35: '#e91e63',  // magenta
  36: '#00bcd4',  // cyan
  37: '#ffffff',  // white
  90: '#9e9e9e',  // gray
  91: '#ff5252',  // lightred
  92: '#8bc34a',  // lightgreen
  93: '#ffc107',  // lightyellow
  94: '#03a9f4',  // lightblue
  95: '#ec407a',  // lightmagenta
  96: '#26c6da',  // lightcyan
  97: '#fafafa',  // white
};

const backgroundColors: {[key: number]: string} = {
  40: '#000000',  // black
  41: '#f44336',  // red
  42: '#4caf50',  // green
  43: '#ffeb3b',  // yellow
  44: '#2196f3',  // blue
  45: '#e91e63',  // magenta
  46: '#00bcd4',  // cyan
  47: '#ffffff',  // white
  100: '#9e9e9e', // gray
  101: '#ff5252', // lightred
  102: '#8bc34a', // lightgreen
  103: '#ffc107', // lightyellow
  104: '#03a9f4', // lightblue
  105: '#ec407a', // lightmagenta
  106: '#26c6da', // lightcyan
  107: '#fafafa', // white
};

export interface AnsiSegment {
  text: string;
  state: AnsiState;
}

// Parses a text string containing ANSI escape sequences and returns a collection of text segments with styling
export function parseAnsiString(text: string): AnsiSegment[] {
  const result: AnsiSegment[] = [];
  const regex = /\u001b\[((?:\d+;)*\d*)m/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let currentState: AnsiState = {};
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the escape sequence with current state
    const segment = text.substring(lastIndex, match.index);
    if (segment) {
      result.push({
        text: segment,
        state: { ...currentState }
      });
    }
    
    // Update state based on escape sequence
    const codes = match[1].split(';').map(num => parseInt(num || '0', 10));
    
    // Process codes
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      
      // Process reset and text styles
      if (code === 0) {
        // Reset all attributes
        currentState = {};
      } else if (code === 1) {
        currentState.bold = true;
      } else if (code === 2) {
        currentState.dim = true;
      } else if (code === 3) {
        currentState.italic = true;
      } else if (code === 4) {
        currentState.underline = true;
      } else if (code === 9) {
        currentState.strikethrough = true;
      } else if (code === 22) {
        currentState.bold = false;
        currentState.dim = false;
      } else if (code === 23) {
        currentState.italic = false;
      } else if (code === 24) {
        currentState.underline = false;
      } else if (code === 29) {
        currentState.strikethrough = false;
      } else if (code === 39) {
        delete currentState.foreground;
      } else if (code === 49) {
        delete currentState.background;
      } 
      // Standard colors
      else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
        currentState.foreground = foregroundColors[code];
      } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
        currentState.background = backgroundColors[code];
      }
      // 8-bit color support (256 colors)
      else if (code === 38 && i + 2 < codes.length && codes[i+1] === 5) {
        const colorCode = codes[i+2];
        // Generate 8-bit color
        if (colorCode < 8) {
          // Standard colors (0-7)
          currentState.foreground = foregroundColors[colorCode + 30];
        } else if (colorCode < 16) {
          // High intensity colors (8-15)
          currentState.foreground = foregroundColors[colorCode - 8 + 90];
        } else if (colorCode < 232) {
          // 216 colors (16-231): 6×6×6 cube
          const r = Math.floor((colorCode - 16) / 36) * 51;
          const g = Math.floor(((colorCode - 16) % 36) / 6) * 51;
          const b = ((colorCode - 16) % 6) * 51;
          currentState.foreground = `rgb(${r}, ${g}, ${b})`;
        } else {
          // Grayscale (232-255)
          const gray = (colorCode - 232) * 10 + 8;
          currentState.foreground = `rgb(${gray}, ${gray}, ${gray})`;
        }
        i += 2; // Skip the next two parameters
      }
      else if (code === 48 && i + 2 < codes.length && codes[i+1] === 5) {
        const colorCode = codes[i+2];
        // Same logic for background colors
        if (colorCode < 8) {
          currentState.background = backgroundColors[colorCode + 40];
        } else if (colorCode < 16) {
          currentState.background = backgroundColors[colorCode - 8 + 100];
        } else if (colorCode < 232) {
          const r = Math.floor((colorCode - 16) / 36) * 51;
          const g = Math.floor(((colorCode - 16) % 36) / 6) * 51;
          const b = ((colorCode - 16) % 6) * 51;
          currentState.background = `rgb(${r}, ${g}, ${b})`;
        } else {
          const gray = (colorCode - 232) * 10 + 8;
          currentState.background = `rgb(${gray}, ${gray}, ${gray})`;
        }
        i += 2; // Skip the next two parameters
      }
      // 24-bit color support (RGB)
      else if (code === 38 && i + 4 < codes.length && codes[i+1] === 2) {
        const r = codes[i+2];
        const g = codes[i+3];
        const b = codes[i+4];
        currentState.foreground = `rgb(${r}, ${g}, ${b})`;
        i += 4; // Skip the next four parameters
      }
      else if (code === 48 && i + 4 < codes.length && codes[i+1] === 2) {
        const r = codes[i+2];
        const g = codes[i+3];
        const b = codes[i+4];
        currentState.background = `rgb(${r}, ${g}, ${b})`;
        i += 4; // Skip the next four parameters
      }
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add the remaining text with current state
  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    result.push({
      text: remainingText,
      state: { ...currentState }
    });
  }
  
  return result;
}

// Helper to apply ANSI styling to an HTML element
export function applyAnsiStyling(element: HTMLElement, state: AnsiState): void {
  if (state.foreground) {
    element.style.color = state.foreground;
  }
  if (state.background) {
    element.style.backgroundColor = state.background;
  }
  if (state.bold) {
    element.style.fontWeight = 'bold';
  }
  if (state.dim) {
    element.style.opacity = '0.7';
  }
  if (state.italic) {
    element.style.fontStyle = 'italic';
  }
  if (state.underline) {
    element.style.textDecoration = (element.style.textDecoration || '') + ' underline';
  }
  if (state.strikethrough) {
    element.style.textDecoration = (element.style.textDecoration || '') + ' line-through';
  }
}
