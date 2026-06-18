#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import commands2
import commands2.cmd
import wpimath.controller

from subsystems.drivesubsystem import DriveSubsystem

import constants


class TurnToAngle(commands2.PIDCommand):
    """A command that will turn the robot to the specified angle."""

    def __init__(self, targetAngleDegrees: float, drive: DriveSubsystem) -> None:
        """
        Turns to robot to the specified angle.

        :param: targetAngleDegrees The angle to turn to
        :param: drive The drive subsystem to
        """
        super().__init__(
            wpimath.controller.PIDController(
                constants.DriveConstants.kTurnP,
                constants.DriveConstants.kTurnI,
                constants.DriveConstants.kTurnD,
            ),
            # Close loop on heading
            drive.getHeading,
            # Set reference to target
            targetAngleDegrees,
            # Pipe output to turn robot
            lambda output: drive.arcadeDrive(0, output),
            # Require the drive
            drive,
        )

        # Set the controller to be continuous (because it is an angle controller)
        self.getController().enableContinuousInput(-180, 180)

        # Set the controller tolerance - the delta tolerance ensures the robot is stationary at the
        # setpoint before it is considered as having reached the reference
        self.getController().setTolerance(
            constants.DriveConstants.kTurnToleranceDeg,
            constants.DriveConstants.kTurnRateToleranceDegPerS,
        )

    def isFinished(self) -> bool:
        # End when the controller is at the reference.
        return self.getController().atSetpoint()
