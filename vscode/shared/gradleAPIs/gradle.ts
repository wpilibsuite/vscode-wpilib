'use strict';
import * as vscode from 'vscode';
import * as child_process from 'child_process';

export interface IDebuggerParse {
    port: string;
    ip: string;
}

export function parseGradleOutput(output: IOutputPair): IDebuggerParse {
    const ret: IDebuggerParse = {
        port: '',
        ip: ''
    };

    const results = output.stdout.split('\n');
    for (const r of results) {
        if (r.indexOf('DEBUGGING ACTIVE ON PORT ') >= 0) {
            ret.port = r.substring(27, r.indexOf('!')).trim();
        }
        if (r.indexOf('Using address ') >= 0) {
            ret.ip = r.substring(14, r.indexOf(' for')).trim();
        }
    }

    return ret;
}

export interface IOutputPair {
    stdout: string;
    stderr: string;
}

export function executeCommandAsync(command: string, rootDir: string, ow?: vscode.OutputChannel): Promise<IOutputPair> {
    return new Promise(function (resolve, reject) {
        const exec = child_process.exec;
        const child = exec(command, {
            cwd: rootDir
        }, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout: stdout, stderr: stderr });
            }
        });

        if (ow === undefined) {
            return;
        }

        child.stdout.on('data', (data) => {
            ow.append(data.toString());
        });

        child.stderr.on('data', (data) => {
            ow.append(data.toString());
        });
    });
}

export async function gradleRun(args: string, rootDir: string, ow?: vscode.OutputChannel): Promise<IOutputPair> {
    let command = 'gradlew ' + args;
    if (process.platform !== 'win32') {
        command = './' + command;
    }
    return await executeCommandAsync(command, rootDir, ow);
}
