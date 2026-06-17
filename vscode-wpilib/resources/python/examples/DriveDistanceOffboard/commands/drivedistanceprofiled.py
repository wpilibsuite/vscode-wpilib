#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import commands2

import wpimath

import subsystems.drivesubsystem
import constants


class DriveDistanceProfiled(commands2.TrapezoidProfileCommand):
    """Drives a set distance using a motion profile."""

    def __init__(
        self, meters: float, drive: subsystems.drivesubsystem.DriveSubsystem
    ) -> None:
        """Creates a new DriveDistanceProfiled command.

        :param meters: The distance to drive.
        :param drive:  The drive subsystem to use.
        """
        super().__init__(
            wpimath.TrapezoidProfile(
                # Limit the max acceleration and velocity
                wpimath.TrapezoidProfile.Constraints(
                    constants.DriveConstants.kMaxSpeedMetersPerSecond,
                    constants.DriveConstants.kMaxAccelerationMetersPerSecondSquared,
                )
            ),
            # Pipe the profile state to the drive
            lambda setpointState: drive.setDriveStates(setpointState, setpointState),
            # End at desired position in meters; implicitly starts at 0
            lambda: wpimath.TrapezoidProfile.State(meters, 0),
            # Current position
            lambda: wpimath.TrapezoidProfile.State(0, 0),
            # Require the drive
            drive,
        )
        # Reset drive encoders since we're starting at 0
        drive.resetEncoders()
