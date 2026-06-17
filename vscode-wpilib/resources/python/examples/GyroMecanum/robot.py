#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#


import wpilib
import wpilib.drive


class MyRobot(wpilib.TimedRobot):
    """
    This is a sample program that uses mecanum drive with a gyro sensor to maintain rotation vectors
    in relation to the starting orientation of the robot (field-oriented controls).
    """

    # gyro calibration constant, may need to be adjusted;
    # gyro value of 360 is set to correspond to one full revolution
    kVoltsPerDegreePerSecond = 0.0128

    kFrontLeftChannel = 0
    kRearLeftChannel = 1
    kFrontRightChannel = 2
    kRearRightChannel = 3
    kGyroPort = 0
    kJoystickPort = 0

    def robotInit(self):
        """Robot initialization function"""

        self.gyro = wpilib.AnalogGyro(self.kGyroPort)
        self.joystick = wpilib.Joystick(self.kJoystickPort)

        frontLeft = wpilib.PWMSparkMax(self.kFrontLeftChannel)
        rearLeft = wpilib.PWMSparkMax(self.kRearLeftChannel)
        frontRight = wpilib.PWMSparkMax(self.kFrontRightChannel)
        rearRight = wpilib.PWMSparkMax(self.kRearRightChannel)

        frontRight.setInverted(True)
        rearRight.setInverted(True)

        self.robotDrive = wpilib.drive.MecanumDrive(
            frontLeft, rearLeft, frontRight, rearRight
        )

        self.gyro.setSensitivity(self.kVoltsPerDegreePerSecond)

    def teleopPeriodic(self):
        self.robotDrive.driveCartesian(
            -self.joystick.getY(),
            -self.joystick.getX(),
            -self.joystick.getZ(),
            self.gyro.getRotation2d(),
        )
