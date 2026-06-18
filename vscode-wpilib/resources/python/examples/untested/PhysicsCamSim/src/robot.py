#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import math

import wpilib

import wpilib.drive
import wpimath.controller

from networktables.util import ntproperty


class MyRobot(wpilib.TimedRobot):
    """Main robot class"""

    # array of (found, timestamp, angle)
    target = ntproperty("/camera/target", (0.0, float("inf"), 0.0))

    # Often, you will find it useful to have different parameters in
    # simulation than what you use on the real robot

    if wpilib.RobotBase.isSimulation():
        # These PID parameters are used in simulation
        kP = 0.03
        kI = 0.00
        kD = 0.00
        kF = 0.00
    else:
        # These PID parameters are used on a real robot
        kP = 0.03
        kI = 0.00
        kD = 0.00
        kF = 0.00

    kToleranceDegrees = 2.0

    def robotInit(self):
        """Robot-wide initialization code should go here"""

        # Basic robot chassis setup
        self.stick = wpilib.Joystick(0)

        # Create a robot drive with two PWM controlled Talon SRXs.

        self.leftMotor = wpilib.PWMTalonSRX(1)
        self.rightMotor = wpilib.PWMTalonSRX(2)

        self.robot_drive = wpilib.drive.DifferentialDrive(
            self.leftMotor, self.rightMotor
        )

        self.leftEncoder = wpilib.Encoder(0, 1, reverseDirection=False)

        # The right-side drive encoder
        self.rightEncoder = wpilib.Encoder(2, 3, reverseDirection=True)

        # Sets the distance per pulse for the encoders
        self.leftEncoder.setDistancePerPulse((6 * math.pi) / 1024)
        self.rightEncoder.setDistancePerPulse((6 * math.pi) / 1024)

        # Position gets automatically updated as robot moves
        self.gyro = wpilib.AnalogGyro(0)

        # Use PIDController to control angle
        turnController = wpimath.controller.PIDController(
            self.kP, self.kI, self.kD, self.kF
        )
        turnController.setTolerance(self.kToleranceDegrees)

        self.turnController = turnController

        self.rotateToAngleRate = 0

    def normalizeAngle(self, angle):
        """Normalize angle to [-180,180]"""
        return ((angle + 180) % 360) - 180.0

    def pidGet(self):
        """The angle to feed to PIDController must be between
        -180 and 180"""
        return self.normalizeAngle(self.gyro.getAngle())

    def pidWrite(self, output):
        """This function is invoked periodically by the PID Controller"""
        self.rotateToAngleRate = output

    def teleopPeriodic(self):
        """Called every 20ms in teleop"""

        # if trigger is pressed, then center the robot to the camera target

        if self.stick.getRawButton(6):
            found, timestamp, offset = self.target
            turnSpeed = 0.0

            if found > 0:
                # remember: the camera tells you the *offset*, so the angle you
                # want the robot to go to is the angle + the offset
                angle = self.gyro.getAngle() + offset

                # setpoint needs to be normalized
                angle = self.normalizeAngle(angle)

                # print('goto ' + str(angle))

                self.turnController.setSetpoint(angle)
                turnSpeed = self.rotateToAngleRate

            self.robot_drive.arcadeDrive(0, turnSpeed, squareInputs=True)
        else:
            self.robot_drive.arcadeDrive(
                self.stick.getY() * -1, self.stick.getX(), squareInputs=True
            )
