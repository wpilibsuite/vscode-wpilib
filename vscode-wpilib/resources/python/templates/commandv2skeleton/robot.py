# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import commands2
import robotcontainer
from commands2 import CommandScheduler
import hal

class MyRobot(commands2.TimedCommandRobot):
    def robotInit(self) -> None:
        self.robotContainer = robotcontainer.RobotContainer()

    def robotPeriodic(self) -> None:
      CommandScheduler.getInstance().run()

    def disabledInit(self):
       
    
    def autonomousInit(self) -> None:
        self.autonomousCommand = self.container.getAutonomousCommand()

        # schedule the autonomous command (example)
        if self.autonomousCommand is not None:
            self.autonomousCommand.schedule()

    def teleopInit(self) -> None:
        # This makes sure that the autonomous stops running when
        # teleop starts running. If you want the autonomous to
        # continue until interrupted by another command, remove
        # this line or comment it out.
        if self.autonomousCommand is not None:
            self.autonomousCommand.cancel()

    def testInit(self) -> None:
        # Cancels all running commands at the start of test mode.
        commands2.CommandScheduler.getInstance().cancelAll()