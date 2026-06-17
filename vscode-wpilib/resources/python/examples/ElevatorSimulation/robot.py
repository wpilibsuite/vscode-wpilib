#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import math
import wpilib
import wpimath


class MyRobot(wpilib.TimedRobot):
    kMotorPort = 0
    kEncoderAChannel = 0
    kEncoderBChannel = 1
    kJoystickPort = 0

    kElevatorKp = 5.0
    kElevatorGearing = 10.0
    kElevatorDrumRadius = 0.0508  # 2 inches in meters
    kCarriageMass = 4

    kMinElevatorHeight = 0.0508  # 2 inches
    kMaxElevatorHeight = 1.27  # 50 inches

    # distance per pulse = (distance per revolution) / (pulses per revolution)
    #  = (Pi * D) / ppr
    kElevatorEncoderDistPerPulse = 2.0 * math.pi * kElevatorDrumRadius / 4096.0

    def robotInit(self) -> None:
        # standard classes for controlling our elevator
        self.controller = wpimath.PIDController(self.kElevatorKp, 0, 0)
        self.encoder = wpilib.Encoder(self.kEncoderAChannel, self.kEncoderBChannel)
        self.motor = wpilib.PWMSparkMax(self.kMotorPort)
        self.joystick = wpilib.Joystick(self.kJoystickPort)

        self.encoder.setDistancePerPulse(self.kElevatorEncoderDistPerPulse)

    def teleopPeriodic(self) -> None:
        if self.joystick.getTrigger():
            # Here, we run PID control like normal, with a constant setpoint of 30in (0.762 meters).
            pidOutput = self.controller.calculate(self.encoder.getDistance(), 0.762)
            self.motor.setVoltage(pidOutput)
        else:
            # Otherwise we disable the motor
            self.motor.set(0.0)

    def disabledInit(self) -> None:
        # This just makes sure that our simulation code knows that the motor is off
        self.motor.set(0)
