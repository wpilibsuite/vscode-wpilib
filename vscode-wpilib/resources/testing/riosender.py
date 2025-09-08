#!/usr/bin/env python3

import socketserver
import struct
import time

class ConsoleHandler(socketserver.StreamRequestHandler):
    tagHeader = struct.Struct("!HB")
    errorMsgStart = struct.Struct("!fHHIB")
    stringSize = struct.Struct("!H")
    printMsgStart = struct.Struct("!fH")

    def makeErrorMsgInner(self, timestamp, sequence, occur, errorCode, flags, details, location, callStack):
        detailsBytes = details.encode('utf-8')
        locationBytes = location.encode('utf-8')
        callStackBytes = callStack.encode('utf-8')
        return b''.join([
            self.errorMsgStart.pack(timestamp, sequence, occur, errorCode, flags),
            self.stringSize.pack(len(detailsBytes)),
            detailsBytes,
            self.stringSize.pack(len(locationBytes)),
            locationBytes,
            self.stringSize.pack(len(callStackBytes)),
            callStackBytes])

    def makeErrorMsg(self, timestamp, sequence, occur, errorCode, flags, details, location, callStack):
        inner = self.makeErrorMsgInner(timestamp, sequence, occur, errorCode, flags, details, location, callStack)
        return b''.join([self.tagHeader.pack(len(inner) + 1, 11), inner])

    def makeErrorMsgSplit(self, timestamp, sequence, occur, errorCode, flags, details, location, callStack):
        inner = self.makeErrorMsgInner(timestamp, sequence, occur, errorCode, flags, details, location, callStack)
        return [self.tagHeader.pack(len(inner) + 1, 11), inner]

    def makePrintMsgInner(self, timestamp, sequence, line):
        return b''.join([
            self.printMsgStart.pack(timestamp, sequence),
            line.encode('utf-8')])

    def makePrintMsg(self, timestamp, sequence, line):
        inner = self.makePrintMsgInner(timestamp, sequence, line)
        return b''.join([self.tagHeader.pack(len(inner) + 1, 12), inner])

    def handle(self):
        startTime = time.time()
        sequence = 0
        count = 0
        while 1:
            timestamp = time.time() - startTime
            sequence = (sequence + 1) & 0xffff
            split = self.makeErrorMsgSplit(timestamp, sequence, 1, 0x111111, 1, "this is an error with a super long text. We want to know if the riolog will correctly wrap the content to the next line once it goes wayyyyyyyyyyyyyyyyyyyyyyy over the length limit.", "foo.c:1111", "traceback 1\ntraceback 2\ntraceback 3\n")
            print(split[0])
            print (split[1])
            self.wfile.write(split[0])
            time.sleep(0.1)
            self.wfile.write(split[1])
            self.wfile.write(self.makePrintMsg(timestamp, sequence, str(count)))
            count = count + 1
            time.sleep(0.25)
            #self.wfile.write(self.makePrintMsg(timestamp, sequence, str(count)))
            count = count + 1
            time.sleep(0.1)
            #self.wfile.write(self.makeErrorMsg(timestamp, sequence, 1, 0x111111, 0, "this is a warning", "foo.c:1111", "traceback 1\ntraceback 2\ntraceback 3\n"))
            #self.wfile.write(self.makePrintMsg(timestamp, sequence, str(count)))
            count = count + 1
            #time.sleep(1)

if __name__ == "__main__":
    server = socketserver.TCPServer(("localhost", 1741), ConsoleHandler)
    try:
        server.serve_forever()
    finally:
        server.server_close()
