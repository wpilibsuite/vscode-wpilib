# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import wpilib
import commands2
from subsystems import ExampleSubsystem
from commands import ExampleCommand

class Auto:
    async def exampleAuto(subsystem):
        return commands2.sequentialcommandgroup(subsystem.exampleAuto(), ExampleCommand(subsystem))
    
