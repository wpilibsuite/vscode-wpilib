#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import commands2
import commands2.cmd
import wpimath.controller
import wpimath.trajectory

import constants
import examplesmartmotorcontroller


class ArmSubsystem(commands2.TrapezoidProfileSubsystem):
    """A robot arm subsystem that moves with a motion profile."""

    # Create a new ArmSubsystem
    def __init__(self) -> None:
        super().__init__(
            wpimath.trajectory.TrapezoidProfile.Constraints(
                constants.kMaxVelocityRadPerSecond,
                constants.kMaxAccelerationRadPerSecSquared,
            ),
            constants.kArmOffsetRads,
        )
        self.motor = examplesmartmotorcontroller.ExampleSmartMotorController(
            constants.kMotorPort
        )
        self.feedforward = wpimath.controller.ArmFeedforward(
            constants.kSVolts,
            constants.kGVolts,
            constants.kVVoltSecondPerRad,
            constants.kAVoltSecondSquaredPerRad,
        )
        self.motor.setPID(constants.kP, 0, 0)

    def useState(self, setpoint: wpimath.trajectory.TrapezoidProfile.State) -> None:
        # Calculate the feedforward from the setpoint
        feedforward = self.feedforward.calculate(setpoint.position, setpoint.velocity)

        # Add the feedforward to the PID output to get the motor output
        self.motor.setSetPoint(
            examplesmartmotorcontroller.ExampleSmartMotorController.PIDMode.kPosition,
            setpoint.position,
            feedforward / 12.0,
        )

    def setArmGoalCommand(self, kArmOffsetRads: float) -> commands2.Command:
        return commands2.cmd.runOnce(lambda: self.setGoal(kArmOffsetRads), self)
