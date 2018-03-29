import * as args from 'yargs';
import { runInstall } from './install';
import { getProjectDirectories } from './directories';
import { runCompile } from './compile';
import { runPackageVsCode } from './packageVscode';
import { runPackageUtility } from './packageUtility';


async function main(args: args.Arguments): Promise<void> {
  const projects = await getProjectDirectories();

  if (args.i) {
    console.log('running install');
    const installResults = await runInstall(projects);
    for (const i of installResults) {
      console.log(i.command);
      if (i.success) {
        console.log(i.stdout);
      } else {
        console.log(i.err);
      }
    }

    // Allow a failing install, not easy to detect offline
  }

  if (args.c) {
    console.log('running compile');
    const compileResults = await runCompile(projects);

    for (const c of compileResults) {
      if (!c.success) {
        throw c.err;
      }
      console.log(c.command);
      console.log(c.stdout);
    }
  }

  if (args.p) {
    console.log('running publish');

    const vscodeProjects = projects.filter((v) => {
      if (v.indexOf('vscode-wpilib') >= 0) {
        return true;
      }
      return false;
    });

    const standaloneProjects = projects.filter((v) => {
      if (v.indexOf('utility-standalone') >= 0) {
        return true;
      }
      return false;
    });

    const vscodePublishResults = await runPackageVsCode(vscodeProjects);
    const standalonePublishResults = await runPackageUtility(standaloneProjects, true, true, true);

    for (const c of vscodePublishResults) {
      if (!c.success) {
        throw c.err;
      }
      console.log(c.command);
      console.log(c.stdout);
    }

    for (const c of standalonePublishResults) {
      if (!c.success) {
        throw c.err;
      }
      console.log(c.command);
      console.log(c.stdout);
    }
  }
}

args.alias('i', 'install').describe('i', 'run npm install on all projects').boolean('i');
args.alias('c', 'compile').describe('c', 'compile all projects').boolean('c');
args.alias('p', 'publish').describe('p', 'create packages for publishing').boolean('p');

main(args.argv).then(() => {
  console.log('finished');
}).catch((err) => {
  console.log(err);
});

