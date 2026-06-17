# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import wpilib
import commands2
from subsystems import ExampleSubsystem
import Constants
from commands import Autos

class RobotContainer:
    def __init__(self):
       self.exampleSubsystem = ExampleSubsystem()
       self.driverController = wpilib.NiDsXboxController(Constants.kDriverControllerPort)
       self.configureBindings()

    def configureBindings(self) -> None:
        

    def getAutonomousCommand(self) -> commands2.Command:
        return Autos.exampleAuto(self.exampleSubsystem)
      