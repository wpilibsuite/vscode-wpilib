#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpilib.drive

from robotpy_ext.autonomous import AutonomousModeSelector


class MyRobot(wpilib.TimedRobot):
    """
    This shows using the AutonomousModeSelector to automatically choose
    autonomous modes.

    If you find this useful, you may want to consider using the Magicbot
    framework, as it already has this integrated into it.
    """

    def robotInit(self):
        # Simple two wheel drive
        self.drive = wpilib.drive.DifferentialDrive(wpilib.Talon(0), wpilib.Talon(1))

        # Items in this dictionary are available in your autonomous mode
        # as attributes on your autonomous object
        self.components = {"drive": self.drive}

        # * The first argument is the name of the package that your autonomous
        #   modes are located in
        # * The second argument is passed to each StatefulAutonomous when they
        #   start up
        self.automodes = AutonomousModeSelector("autonomous", self.components)

    def autonomousInit(self):
        self.drive.setSafetyEnabled(True)
        self.automodes.start()

    def autonomousPeriodic(self):
        self.automodes.periodic()

    def disabledInit(self):
        self.automodes.disable()

    def teleopInit(self):
        pass

    def teleopPeriodic(self):
        pass
