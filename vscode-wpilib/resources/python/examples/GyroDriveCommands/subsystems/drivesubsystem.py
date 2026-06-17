#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

from wpilib import PWMSparkMax, Encoder, ADXRS450_Gyro
from wpilib.drive import DifferentialDrive
import commands2
import math

import constants


class DriveSubsystem(commands2.Subsystem):
    def __init__(self) -> None:
        """Creates a new DriveSubsystem"""
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
        self.leftEncoder = Encoder(
            constants.DriveConstants.kLeftEncoderPorts[0],
            constants.DriveConstants.kLeftEncoderPorts[1],
            constants.DriveConstants.kLeftEncoderReversed,
        )

        # The right-side drive encoder
        self.rightEncoder = Encoder(
            constants.DriveConstants.kRightEncoderPorts[0],
            constants.DriveConstants.kRightEncoderPorts[1],
            constants.DriveConstants.kRightEncoderReversed,
        )

        # We need to invert one side of the drivetrain so that positive voltages
        # result in both sides moving forward. Depending on how your robot's
        # gearbox is constructed, you might have to invert the left side instead.
        self.right1.setInverted(True)

        # Sets the distance per pulse for the encoders
        self.leftEncoder.setDistancePerPulse(
            constants.DriveConstants.kEncoderDistancePerPulse
        )
        self.rightEncoder.setDistancePerPulse(
            constants.DriveConstants.kEncoderDistancePerPulse
        )

        self.gyro = ADXRS450_Gyro()

    def arcadeDrive(self, fwd: float, rot: float):
        """
        Drives the robot using arcade controls.

        :param fwd: the commanded forward movement
        :param rot: the commanded rotation
        """
        self.drive.arcadeDrive(fwd, rot)

    def resetEncoders(self):
        """Resets the drive encoders to currently read a position of 0."""
        self.leftEncoder.reset()
        self.rightEncoder.reset()

    def getAverageEncoderDistance(self):
        """
        Gets the average distance of the two encoders.

        :returns: the average of the two encoder readings
        """
        return (self.leftEncoder.getDistance() + self.rightEncoder.getDistance()) / 2.0

    def getLeftEncoder(self) -> Encoder:
        """
        Gets the left drive encoder.

        :returns: the left drive encoder
        """
        return self.leftEncoder

    def getRightEncoder(self) -> Encoder:
        """
        Gets the right drive encoder.

        :returns: the right drive encoder
        """
        return self.rightEncoder

    def setMaxOutput(self, maxOutput: float):
        """
        Sets the max output of the drive. Useful for scaling the drive to drive more slowly.

        :param maxOutput: the maximum output to which the drive will be constrained
        """
        self.drive.setMaxOutput(maxOutput)

    def zeroHeading(self):
        """
        Zeroes the heading of the robot.
        """
        self.gyro.reset()

    def getHeading(self):
        """
        Returns the heading of the robot.

        :returns: the robot's heading in degrees, from 180 to 180
        """
        return math.remainder(self.gyro.getAngle(), 180) * (
            -1 if constants.DriveConstants.kGyroReversed else 1
        )

    def getTurnRate(self):
        """
        Returns the turn rate of the robot.

        :returns: The turn rate of the robot, in degrees per second
        """
        return self.gyro.getRate() * (
            -1 if constants.DriveConstants.kGyroReversed else 1
        )
