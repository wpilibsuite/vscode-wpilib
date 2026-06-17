# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import wpilib
import commands2
from commands2 import Command

class RobotContainer:
    def __init__(self) -> None:
       self.configureBindings()

    def configureBindings(self) -> None:

    def getAutonomousCommand() -> Command:
        return commands2.printcommand("No autonomous command configured")