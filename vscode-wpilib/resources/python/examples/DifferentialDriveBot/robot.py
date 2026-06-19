#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpimath

from drivetrain import Drivetrain


class MyRobot(wpilib.TimedRobot):
    def __init__(self):
        super().__init__()
        self.controller = wpilib.NiDsXboxController(0)
        self.drive = Drivetrain()

        # Slew rate limiters to make joystick inputs more gentle; 1/3 sec from 0 to 1.
        self.speed_limiter = wpimath.SlewRateLimiter(3)
        self.rot_limiter = wpimath.SlewRateLimiter(3)

    def autonomousPeriodic(self):
        self.teleopPeriodic()
        self.drive.updateOdometry()

    def teleopPeriodic(self):
        # Get the x speed. We are inverting this because Xbox controllers return
        # negative values when we push forward.
        xSpeed = (
            -self.speed_limiter.calculate(self.controller.getLeftY())
            * Drivetrain.MAX_SPEED
        )

        # Get the rate of angular rotation. We are inverting this because we want a
        # positive value when we pull to the left (remember, CCW is positive in
        # mathematics). Xbox controllers return positive values when you pull to
        # the right by default.
        rot = (
            -self.rot_limiter.calculate(self.controller.getRightX())
            * Drivetrain.MAX_ANGULAR_SPEED
        )

        self.drive.drive(xSpeed, rot)
