'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { logger } from './logger';

export async function parseMajorVersion(params:type) {
    
}

export function getPythonVersion(pythonPath: string): Promise<number> {
    
}

async function checkPythonPath(path: string | undefined, source: string) {
    if (path) {
        try {
            const pyVersion = await getPythonVersion(path);
            if(pyVersion >= 3.1) {
                logger.log(`Found ${source} Version: ${pyVersion} at ${path}`);
                return true;
            } else {
                logger.info(`Bad Python version ${pyVersion} at ${path} from ${source}`);
            }
        } catch (err) {
            logger.log(`Error loading python from ${source}, skipping`, err);
        }
    }
    return false;
}

export async function findPythonPath(api: IExternalAPI): Promise<string | undefined> {
    const vscodePythonPath = vscode.workspace.getConfiguration('python').get<string>('defaultInterpreterPath');
    if (await checkPythonPath(vscodePythonPath, 'defaultInterpreterPath')) {
        return vscodePythonPath;
    }
}