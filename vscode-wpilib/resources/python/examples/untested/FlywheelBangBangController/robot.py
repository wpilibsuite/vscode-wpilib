#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpilib.simulation
import wpimath.controller
import wpimath.units

import math


class MyRobot(wpilib.TimedRobot):
    """
    This is a sample program to demonstrate the use of a BangBangController with a flywheel to
    control RPM.
    """

    kMotorPort = 0
    kEncoderAChannel = 0
    kEncoderBChannel = 1

    # Max setpoint for joystick control in RPM
    kMaxSetpointValue = 6000.0

    # Gains are for example purposes only - must be determined for your own robot!
    kFlywheelKs = 0.0001  # V
    kFlywheelKv = 0.000195  # V/RPM
    kFlywheelKa = 0.0003  # V/(RPM/s)

    # Reduction between motors and encoder, as output over input. If the flywheel
    # spins slower than the motors, this number should be greater than one.
    kFlywheelGearing = 1.0

    # 1/2 MR²
    kFlywheelMomentOfInertia = (
        0.5
        * wpimath.units.lbsToKilograms(1.5)
        * math.pow(wpimath.units.inchesToMeters(4), 2)
    )

    def robotInit(self):
        """Robot initialization function"""

        self.feedforward = wpimath.controller.SimpleMotorFeedforwardMeters(
            self.kFlywheelKs, self.kFlywheelKv, self.kFlywheelKa
        )

        # Joystick to control setpoint
        self.joystick = wpilib.Joystick(0)

        self.flywheelMotor = wpilib.PWMSparkMax(self.kMotorPort)
        self.encoder = wpilib.Encoder(self.kEncoderAChannel, self.kEncoderBChannel)

        self.bangBangControler = wpimath.controller.BangBangController()

        # Add bang-bang controler to SmartDashboard and networktables.
        wpilib.SmartDashboard.putData(self.bangBangControler)

    def teleopPeriodic(self):
        """Controls flywheel to a set speed (RPM) controlled by a joystick."""

        # Scale setpoint value between 0 and maxSetpointValue
        setpoint = max(
            0.0,
            self.joystick.getRawAxis(0)
            * wpimath.units.rotationsPerMinuteToRadiansPerSecond(
                self.kMaxSetpointValue
            ),
        )

        # Set setpoint and measurement of the bang-bang controller
        bangOutput = (
            self.bangBangControler.calculate(self.encoder.getRate(), setpoint) * 12.0
        )

        # Controls a motor with the output of the BangBang controller and a
        # feedforward. The feedforward is reduced slightly to avoid overspeeding
        # the shooter.
        self.flywheelMotor.setVoltage(
            bangOutput + 0.9 * self.feedforward.calculate(setpoint)
        )
