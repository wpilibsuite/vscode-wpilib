#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib

from subsytems.arm import Arm
from constants import Constants


class MyRobot(wpilib.TimedRobot):
    def robotInit(self):
        self.arm = Arm()
        self.joystick = wpilib.Joystick(Constants.kJoystickPort)

    def teleopInit(self):
        self.arm.loadPreferences()

    def teleopPeriodic(self):
        if self.joystick.getTrigger():
            # Here, we run PID control like normal.
            self.arm.reachSetpoint()
        else:
            # Otherwise, we disable the motor.
            self.arm.stop()

    def disabledInit(self):
        # This just makes sure that our simulation code knows that the motor's off.
        self.arm.stop()
