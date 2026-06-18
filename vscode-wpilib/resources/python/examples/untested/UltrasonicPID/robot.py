#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpilib.drive
import wpimath.controller
import wpimath.filter


class MyRobot(wpilib.TimedRobot):
    """
    This is a sample program to demonstrate the use of a PIDController with an ultrasonic sensor to
    reach and maintain a set distance from an object.
    """

    # distance the robot wants to stay from an object
    # (one meter)
    kHoldDistanceMillimeters = 1.0e3

    # proportional speed constant
    # negative because applying positive voltage will bring us closer to the target
    kP = -0.001
    # integral speed constant
    kI = 0.0
    # derivative speed constant
    kD = 0.0

    kLeftMotorPort = 0
    kRightMotorPort = 1

    kUltrasonicPingPort = 0
    kUltrasonicEchoPort = 1

    def robotInit(self):
        # Ultrasonic sensors tend to be quite noisy and susceptible to sudden outliers,
        # so measurements are filtered with a 5-sample median filter
        self.filter = wpimath.filter.MedianFilter(5)

        self.ultrasonic = wpilib.Ultrasonic(
            self.kUltrasonicPingPort, self.kUltrasonicEchoPort
        )
        self.leftMotor = wpilib.PWMSparkMax(self.kLeftMotorPort)
        self.rightMotor = wpilib.PWMSparkMax(self.kRightMotorPort)
        self.robotDrive = wpilib.drive.DifferentialDrive(
            self.leftMotor, self.rightMotor
        )
        self.pidController = wpimath.controller.PIDController(self.kP, self.kI, self.kD)

    def autonomousInit(self):
        # Set setpoint of the pid controller
        self.pidController.setSetpoint(self.kHoldDistanceMillimeters)

    def autonomousPeriodic(self):
        measurement = self.ultrasonic.getRangeMM()
        filteredMeasurement = self.filter.calculate(measurement)
        pidOutput = self.pidController.calculate(filteredMeasurement)

        # disable input squaring -- PID output is linear
        self.robotDrive.arcadeDrive(pidOutput, 0, False)
