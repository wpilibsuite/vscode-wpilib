#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib


class MyRobot(wpilib.TimedRobot):
    """Main robot class."""

    def robotInit(self):
        """Robot-wide initialization code should go here."""
        self.lstick = wpilib.Joystick(0)
        self.motor = wpilib.Talon(3)

        self.timer = wpilib.Timer()
        self.loops = 0

    def autonomousInit(self):
        """Called only at the beginning of autonomous mode."""
        pass

    def autonomousPeriodic(self):
        """Called every 20ms in autonomous mode."""
        pass

    def disabledInit(self):
        """Called only at the beginning of disabled mode."""
        self.logger.info("%d loops / %f seconds", self.loops, self.timer.get())

    def disabledPeriodic(self):
        """Called every 20ms in disabled mode."""
        pass

    def teleopInit(self):
        """Called only at the beginning of teleoperated mode."""
        self.loops = 0
        self.timer.reset()
        self.timer.start()

    def teleopPeriodic(self):
        """Called every 20ms in teleoperated mode"""
        # Move a motor with a Joystick
        self.motor.set(self.lstick.getY())

        # Print out the number of loop iterations passed every second
        self.loops += 1
        if self.timer.advanceIfElapsed(1):
            self.logger.info("%d loops / second", self.loops)
            self.loops = 0
