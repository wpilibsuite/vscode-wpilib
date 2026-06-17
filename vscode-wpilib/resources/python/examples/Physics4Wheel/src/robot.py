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

        # Define front and rear motors
        self.lf_motor = wpilib.PWMSparkMax(1)
        self.lr_motor = wpilib.PWMSparkMax(2)
        self.rf_motor = wpilib.PWMSparkMax(3)
        self.rr_motor = wpilib.PWMSparkMax(4)

        # add the followers to the left and right motors
        self.lf_motor.addFollower(self.lr_motor)
        self.rf_motor.addFollower(self.rr_motor)

        # Set the right side motors to be inverted
        self.lf_motor.setInverted(True)

        self.drive = wpilib.drive.DifferentialDrive(self.lf_motor, self.lr_motor)

        # Position gets automatically updated as robot moves
        self.gyro = wpilib.AnalogGyro(1)

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
        self.drive.tankDrive(-self.lstick.getY(), -self.rstick.getY())
