#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpilib.drive


class MyRobot(wpilib.TimedRobot):
    """Main robot class"""

    def robotInit(self):
        """Robot-wide initialization code should go here"""

        self.lstick = wpilib.Joystick(0)
        self.rstick = wpilib.Joystick(1)

        self.l_motor = wpilib.PWMSparkMax(1)
        self.r_motor = wpilib.PWMSparkMax(2)

        # Position gets automatically updated as robot moves
        self.gyro = wpilib.ADXRS450_Gyro()

        self.drive = wpilib.drive.DifferentialDrive(self.l_motor, self.r_motor)

        self.motor = wpilib.PWMSparkMax(4)

        self.limit1 = wpilib.DigitalInput(1)
        self.limit2 = wpilib.DigitalInput(2)

        self.position = wpilib.AnalogInput(2)

    def autonomousInit(self):
        """Called when autonomous mode is enabled"""

        self.timer = wpilib.Timer()
        self.timer.start()

    def autonomousPeriodic(self):
        if self.timer.get() < 2.0:
            self.drive.arcadeDrive(-1.0, -0.3)
        else:
            self.drive.arcadeDrive(0, 0)

    def teleopPeriodic(self):
        """Called when operation control mode is enabled"""

        self.drive.arcadeDrive(-self.lstick.getY(), self.lstick.getX())

        # Move a motor with a Joystick
        y = self.rstick.getY()

        # stop movement backwards when 1 is on
        if self.limit1.get():
            y = max(0, y)

        # stop movement forwards when 2 is on
        if self.limit2.get():
            y = min(0, y)

        self.motor.set(y)
