#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib

from wpimath.controller import PIDController
from wpimath.system.plant import DCMotor
from wpimath import units

from wpilib.simulation import BatterySim, EncoderSim, RoboRioSim, SingleJointedArmSim

from constants import Constants


class Arm:
    def __init__(self):
        # The P gain for the PID controller that drives this arm.
        self.armKp = Constants.kDefaultArmKp
        self.armSetpointDegrees = Constants.kDefaultArmSetpointDegrees

        # The arm gearbox represents a gearbox containing two Vex 775pro motors.
        self.armGearbox = DCMotor.vex775Pro(2)

        # Standard classes for controlling our arm
        self.controller = PIDController(self.armKp, 0, 0)
        self.encoder = wpilib.Encoder(
            Constants.kEncoderAChannel, Constants.kEncoderBChannel
        )
        self.motor = wpilib.PWMSparkMax(Constants.kMotorPort)

        # Subsystem constructor.
        self.encoder.setDistancePerPulse(Constants.kArmEncoderDistPerPulse)

        # Set the Arm position setpoint and P constant to Preferences if the keys don't already exist
        wpilib.Preferences.initDouble(
            Constants.kArmPositionKey, self.armSetpointDegrees
        )
        wpilib.Preferences.initDouble(Constants.kArmPKey, self.armKp)

    def loadPreferences(self):
        # Read Preferences for Arm setpoint and kP on entering Teleop
        self.armSetpointDegrees = wpilib.Preferences.getDouble(
            Constants.kArmPositionKey, self.armSetpointDegrees
        )
        if self.armKp != wpilib.Preferences.getDouble(Constants.kArmPKey, self.armKp):
            self.armKp = wpilib.Preferences.getDouble(Constants.kArmPKey, self.armKp)
            self.controller.setP(self.armKp)

    def reachSetpoint(self):
        pidOutput = self.controller.calculate(
            self.encoder.getDistance(),
            units.degreesToRadians(self.armSetpointDegrees),
        )
        self.motor.setVoltage(pidOutput)

    def stop(self):
        self.motor.set(0.0)
