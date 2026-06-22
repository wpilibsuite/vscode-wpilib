'use strict';

import * as cp from 'child_process';
import { logger } from './logger';
import { getIsWindows } from './utilities';

export async function getPythonVersion(): Promise<string | undefined> {
    try {
        const version = cp.execSync('python --version').toString();
        const match: RegExpMatchArray | null = version.match(/\d+/g);
        const versionNum = match?.join('.');
        return versionNum;
    } catch (error) {
        logger.log("Error getting python version");
    }
    return undefined;
}

export async function getRobotPyVersion(): Promise<string | undefined> {
    try {
        const regexp = /INSTALLED: .*/;
        let cmd = 'pip index versions --pre robotpy';
        if(getIsWindows()) cmd = 'py -m ' + cmd;
        const out = cp.execSync(cmd).toString();
        const match: RegExpMatchArray | null = out.match(regexp);
        if(match) return match.toString().substring(11);
        return undefined;

    } catch {
        return undefined;
    }
    
}

async function getIsPipInstalled(): Promise<boolean> {
    let cmd = 'pip -h'
    if(getIsWindows()) cmd = 'py -m ';
    const response = cp.execSync(cmd).toString();
    return response.length > 30;
}

async function checkPythonPath(path: string | undefined, source: string) {
    if (path) {
        try {
            const pyVersion = await getPythonVersion();
            const regexp = /1[2-6]/g;
            const version = pyVersion?.match(regexp);
            if(version && version.toString() >= '11') {
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

export async function findPythonPath(): Promise<string | undefined> {
    let cmd = 'python';
    if(getIsWindows()) cmd = 'where ' + cmd;
    else cmd = 'which ' + cmd;
    const vscodePythonPath = cp.execSync(cmd, {encoding: 'utf-8'});
    if (await checkPythonPath(vscodePythonPath, 'Execute Command Output')) {
        return vscodePythonPath;
    }
    return undefined;
}