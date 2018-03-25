'use strict';
import * as vscode from 'vscode';
import * as child_process from 'child_process';

export interface OutputPair {
    stdout: string;
    stderr: string;
}

export function executeCommandAsync(command: string, rootDir: string, ow?: vscode.OutputChannel): Promise<OutputPair> {
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

export async function gradleRun(args: string, rootDir: string, ow?: vscode.OutputChannel): Promise<OutputPair> {
    let command = 'gradlew ' + args;
    if (process.platform !== 'win32') {
        command = './' + command;
    }
    return await executeCommandAsync(command, rootDir, ow);
}
