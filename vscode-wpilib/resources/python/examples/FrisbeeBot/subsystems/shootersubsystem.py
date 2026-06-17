#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpimath.controller
import commands2
import commands2.cmd

import constants


class ShooterSubsystem(commands2.PIDSubsystem):
    def __init__(self) -> None:
        super().__init__(
            wpimath.controller.PIDController(
                constants.ShooterConstants.kP,
                constants.ShooterConstants.kI,
                constants.ShooterConstants.kD,
            )
        )

        self.shooterMotor = wpilib.PWMSparkMax(
            constants.ShooterConstants.kShooterMotorPort
        )
        self.feederMotor = wpilib.PWMSparkMax(
            constants.ShooterConstants.kFeederMotorPort
        )
        self.shooterEncoder = wpilib.Encoder(
            constants.ShooterConstants.kEncoderPorts[0],
            constants.ShooterConstants.kEncoderPorts[1],
            constants.ShooterConstants.kEncoderReversed,
        )
        self.shooterFeedForward = wpimath.controller.SimpleMotorFeedforwardMeters(
            constants.ShooterConstants.kSVolts,
            constants.ShooterConstants.kVVoltSecondsPerRotation,
        )
        self.getController().setTolerance(
            constants.ShooterConstants.kShooterToleranceRPS
        )
        self.shooterEncoder.setDistancePerPulse(constants.ShooterConstants.kEncoderCPR)
        self.setSetpoint(constants.ShooterConstants.kShooterTargetRPS)

    def useOutput(self, output: float, setpoint: float):
        self.shooterMotor.setVoltage(
            output + self.shooterFeedForward.calculate(setpoint)
        )

    def getMeasurement(self) -> float:
        return self.shooterEncoder.getRate()

    def runFeeder(self):
        self.feederMotor.set(constants.ShooterConstants.kFeederSpeed)

    def stopFeeder(self):
        self.feederMotor.set(0)
