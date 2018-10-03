# VS Code WPILib

[![Build status](https://ci.appveyor.com/api/projects/status/p6swigkvyfv693g2/branch/master?svg=true)](https://ci.appveyor.com/project/wpilibsuite/vscode-wpilib/branch/master)

This repository contains the WPILib VS Code extension, along with the standalone electron project that contains some of the functionality of the extension.


## Build Dependencies
* Node JS - Tested with Node 8.
* Java - Tested with Java 11
* VS Code - For development/debugging.
  * TS Lint Extension
  * Chrome Debug Extension
  * In order to debug the extension, you will need the extension dependencies for the extension. The Microsoft C++ extension and the Java extension pack.

## Setting up Dependencies
In order to properly build, there is some setup that needs to occur.
1. Go into `vscode-wpilib` and run `npm install`
2. Go into into `wpilib-utility-standalone` and run `npm install`
3. From the root, run `./gradlew updateAllDependencies`. This will grab the templates and examples from WPILib, and move the shared dependencies from the vscode extension to the standalone utility. This command will need to be reran any time you update the shared dependencies in the vscode project.
4. Open the root folder in VS Code.

## Building and Debugging
Once you have the project open in VS Code, there are 5 debugging targets set up.
* `Extension` Will launch the extension to debug
* `Extension Tests` Will launch the extension tests
* `Standalone: Main` Will launch the standalone project. The debugger will be attached to the host process
* `Standalone: Renderer` Will attach to the standalone projects renderer process
* `Standalone: All` Will launch the standalone project, and attach to the renderer. This will attach 2 separate debuggers.

In addition, each project has a `compile` and a `lint` npm command. These will compile and lint their respective projects. Please run these before submitting any PR, as CI will check these. In addition, VS Code's lint does not detect the same lint errors as running lint manually would.

## Testing
We highly recommend you do any testing by launching in the debugger. Unlike Eclipse, local building is not required to update WPILib versions, so building files to install is not exactly a simple setup. We will be posting instructions for this later, but not currently.

## Warning about shared dependencies.
Because of limitiations in typescript, we cannot easily have a shared library that works in both the vscode extension and the standalone utility. Because VS Code is the primary platform, the files are stored in that folder. Anything in the following folder is considered shared.
* `vscode-wpilib/shared`
* `vscode-wpilib/riolog/shared`
In these, any updates from the the standalone project will not be see in the vscode project, nor will they get committed to git. Please edit these files in the VS Code extension to apply changes.
