#!/usr/bin/env python
import sys
import subprocess
import os

def write_stdout(s):
    sys.stdout.write(s)
    sys.stdout.flush()

def write_stderr(s):
    sys.stderr.write(s)
    sys.stderr.flush()

def main():
    while 1:

        # Process the eventlistener header info
        write_stdout('READY\n')                                 # transition from ACKNOWLEDGED to READY
        line = sys.stdin.readline()                             # read header line from stdin
        write_stderr(line)                                      # print it out to stderr
        headers = dict([ x.split(':') for x in line.split() ])
        data = sys.stdin.read(int(headers['len']))              # read the event payload

        # Optional
        write_stderr(data)                                      # print the event payload to stderr

        # Run the batch job(s)
        os.system("/batches.sh")

        # Write the result of the job(s) 
        write_stdout('RESULT 2\nOK')                            # transition from READY to ACKNOWLEDGED

if __name__ == '__main__':
    main()
