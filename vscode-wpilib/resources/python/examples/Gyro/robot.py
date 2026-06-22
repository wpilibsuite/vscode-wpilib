#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
from wpilib import DifferentialDrive
import wpimath
from wpilib import AnalogGyro


class MyRobot(wpilib.TimedRobot):
    """
    This is a sample program to demonstrate how to use a gyro sensor to make a robot drive straight.
    This program uses a joystick to drive forwards and backwards while the gyro is used for direction
    keeping.
    """

    kAngleSetpoint = 0.0
    kP = 0.005  # propotional turning constant

    # gyro calibration constant, may need to be adjusted;
    # gyro value of 360 is set to correspond to one full revolution
    kVoltsPerDegreePerSecond = 0.0128

    kLeftMotorPort = 0
    kRightMotorPort = 1
    kGyroPort = 0
    kJoystickPort = 0

    def robotInit(self):
        """Robot initialization function"""

        self.leftDrive = wpilib.PWMSparkMax(self.kLeftMotorPort)
        self.rightDrive = wpilib.PWMSparkMax(self.kRightMotorPort)
        self.myRobot = wpilib.DifferentialDrive(self.leftDrive, self.rightDrive)
        self.gyro = AnalogGyro(self.kGyroPort)
        self.joystick = wpilib.Joystick(self.kJoystickPort)

        self.gyro.setSensitivity(self.kVoltsPerDegreePerSecond)

        # We need to invert one side of the drivetrain so that positive voltages
        # result in both sides moving forward. Depending on how your robot's
        # gearbox is constructed, you might have to invert the left side instead.
        self.rightDrive.setInverted(True)

    def teleopPeriodic(self):
        # The motor speed is set from the joystick while the DifferentialDrive turning value is assigned
        # from the error between the setpoint and the gyro angle.
        turningValue = (self.kAngleSetpoint - self.gyro.getAngle()) * self.kP
        self.myRobot.arcadeDrive(-self.joystick.getY(), -turningValue)
