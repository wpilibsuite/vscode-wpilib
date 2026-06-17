# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import wpilib
import commands2

class ExampleSubsystem(commands2.Subsystem):
    def __init__(self):
        super().__init__()

    def exampleMethodCommand(self) -> commands2.Command:
       return self.runOnce(
          () -> {
             # one time action goes here
          }
       )
    
    def exampleCondition(self) -> bool:
       return False

    def periodic(self):
       
    def simulationPeriodic(self):
       