import type { AnsiSegment } from '../../../riolog/ansi/ansiparser';
import type { IErrorMessage, IPrintMessage, MessageType } from '../../../riolog/shared/message';

export type RioLogMessage = IPrintMessage | IErrorMessage;

export type RioLogEntryKind = 'print' | 'warning' | 'error';

export type RioLogEntry = {
  id: number;
  kind: RioLogEntryKind;
  message: RioLogMessage;
  lines: AnsiSegment[][];
  searchText: string;
  expanded?: boolean;
};

export function messageTypeToKind(messageType: MessageType): RioLogEntryKind {
  switch (messageType) {
    case 0:
      return 'error';
    case 1:
      return 'warning';
    default:
      return 'print';
  }
}
