#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

from wpilib import PWMSparkMax, Encoder
from wpilib.drive import DifferentialDrive
import commands2

import constants


class DriveSubsystem(commands2.Subsystem):
    # Creates a new DriveSubsystem
    def __init__(self) -> None:
        super().__init__()

        # The motors on the left side of the drive.
        self.left1 = PWMSparkMax(constants.DriveConstants.kLeftMotor1Port)
        self.left2 = PWMSparkMax(constants.DriveConstants.kLeftMotor2Port)

        # The motors on the right side of the drive.
        self.right1 = PWMSparkMax(constants.DriveConstants.kRightMotor1Port)
        self.right2 = PWMSparkMax(constants.DriveConstants.kRightMotor2Port)

        self.left1.addFollower(self.left2)
        self.right1.addFollower(self.right2)

        # The robot's drive
        self.drive = DifferentialDrive(self.left1, self.right1)

        # The left-side drive encoder
        self.left_encoder = Encoder(
            constants.DriveConstants.kLeftEncoderPorts[0],
            constants.DriveConstants.kLeftEncoderPorts[1],
            constants.DriveConstants.kLeftEncoderReversed,
        )

        # The right-side drive encoder
        self.right_encoder = Encoder(
            constants.DriveConstants.kRightEncoderPorts[0],
            constants.DriveConstants.kRightEncoderPorts[1],
            constants.DriveConstants.kRightEncoderReversed,
        )

        # Sets the distance per pulse for the encoders
        self.left_encoder.setDistancePerPulse(
            constants.DriveConstants.kEncoderDistancePerPulse
        )
        self.right_encoder.setDistancePerPulse(
            constants.DriveConstants.kEncoderDistancePerPulse
        )

        # We need to invert one side of the drivetrain so that positive voltages
        # result in both sides moving forward. Depending on how your robot's
        # gearbox is constructed, you might have to invert the left side instead.
        self.right1.setInverted(True)

    def arcadeDrive(self, fwd: float, rot: float) -> None:
        """Drives the robot using arcade controls.

        :param fwd: the commanded forward movement
        :param rot: the commanded rotation
        """
        self.drive.arcadeDrive(fwd, rot)

    def resetEncoders(self) -> None:
        """Resets the drive encoders to currently read a position of 0."""
        self.left_encoder.reset()
        self.right_encoder.reset()

    def getAverageEncoderDistance(self) -> float:
        """Gets the average distance of the two encoders.

        :returns: the average of the two encoder readings
        """
        return (
            self.left_encoder.getDistance() + self.right_encoder.getDistance()
        ) / 2.0

    def getLeftEncoder(self) -> Encoder:
        """Gets the left drive encoder.

        :returns: the left drive encoder
        """
        return self.left_encoder

    def getRightEncoder(self) -> Encoder:
        """Gets the right drive encoder.

        :returns: the right drive encoder
        """
        return self.right_encoder

    def setMaxOutput(self, max_output: float) -> None:
        """Sets the max output of the drive. Useful for scaling the drive to drive more slowly.

        :param maxOutput: the maximum output to which the drive will be constrained
        """
        self.drive.setMaxOutput(max_output)
