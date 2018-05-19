'use strict';
import * as vscode from 'vscode';
import * as child_process from 'child_process';

export interface IOutputPair {
    stdout: string;
    stderr: string;
    success: boolean;
}

export function executeCommandAsync(command: string, rootDir: string, ow?: vscode.OutputChannel): Promise<IOutputPair> {
    return new Promise(function (resolve, reject) {
        const exec = child_process.exec;
        const child = exec(command, {
            cwd: rootDir
        }, (err, stdout, stderr) => {
            if (err) {
                if (err.message.indexOf('BUILD FAILED') >= 0) {
                    resolve({ stdout: stdout, stderr: stderr, success: false });
                } else {
                    reject(err);
                }
            } else {
                resolve({ stdout: stdout, stderr: stderr, success: true });
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
