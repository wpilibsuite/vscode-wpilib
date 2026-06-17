#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

from commands2 import Subsystem

from wpilib import PWMSparkMax, Encoder, ADXRS450_Gyro
from wpilib.drive import DifferentialDrive

from wpimath.kinematics import DifferentialDriveOdometry, DifferentialDriveWheelSpeeds

import constants


class DriveSubsystem(Subsystem):
    def __init__(self):
        super().__init__()

        # The motors on the left side of the drive.
        self.left1 = PWMSparkMax(constants.kLeftMotor1Port)
        self.left2 = PWMSparkMax(constants.kLeftMotor2Port)

        # The motors on the right side of the drive.
        self.right1 = PWMSparkMax(constants.kRightMotor1Port)
        self.right2 = PWMSparkMax(constants.kRightMotor2Port)

        self.left1.addFollower(self.left2)
        self.right1.addFollower(self.right2)

        # The robot's drive
        self.drive = DifferentialDrive(self.left1, self.right1)

        # We need to invert one side of the drivetrain so that positive voltages
        # result in both sides moving forward. Depending on how your robot's
        # gearbox is constructed, you might have to invert the left side instead.
        self.right1.setInverted(True)

        # The left-side drive encoder
        self.leftEncoder = Encoder(
            constants.kLeftEncoderPorts[0],
            constants.kLeftEncoderPorts[1],
            constants.kLeftEncoderReversed,
        )

        # The right-side drive encoder
        self.rightEncoder = Encoder(
            constants.kRightEncoderPorts[0],
            constants.kRightEncoderPorts[1],
            constants.kRightEncoderReversed,
        )

        # The gyro sensor
        self.gyro = ADXRS450_Gyro()

        # Sets the distance per pulse for the encoders
        self.leftEncoder.setDistancePerPulse(constants.kEncoderDistancePerPulse)
        self.rightEncoder.setDistancePerPulse(constants.kEncoderDistancePerPulse)

        self.resetEncoders()

        self.odometry = DifferentialDriveOdometry(
            self.gyro.getRotation2d(),
            self.leftEncoder.getDistance(),
            self.rightEncoder.getDistance(),
        )

    def periodic(self):
        # Update the odometry in the periodic block
        self.odometry.update(
            self.gyro.getRotation2d(),
            self.leftEncoder.getDistance(),
            self.rightEncoder.getDistance(),
        )

    def getPose(self):
        """Returns the currently-estimated pose of the robot."""
        return self.odometry.getPose()

    def getWheelSpeeds(self):
        """Returns the current wheel speeds of the robot."""
        return DifferentialDriveWheelSpeeds(
            self.leftEncoder.getRate(), self.rightEncoder.getRate()
        )

    def resetOdometry(self, pose):
        """Resets the odometry to the specified pose."""
        self.resetEncoders()
        self.odometry.resetPosition(
            self.gyro.getRotation2d(),
            self.leftEncoder.getDistance(),
            self.rightEncoder.getDistance(),
            pose,
        )

    def arcadeDrive(self, fwd, rot):
        """Drives the robot using arcade controls."""
        self.drive.arcadeDrive(fwd, rot)

    def tankDriveVolts(self, leftVolts, rightVolts):
        """Controls the left and right sides of the drive directly with voltages."""
        self.left1.setVoltage(leftVolts)
        self.right1.setVoltage(rightVolts)
        self.drive.feed()

    def resetEncoders(self):
        """Resets the drive encoders to currently read a position of 0."""
        self.leftEncoder.reset()
        self.rightEncoder.reset()

    def getAverageEncoderDistance(self):
        """Gets the average distance of the two encoders."""
        return (self.leftEncoder.getDistance() + self.rightEncoder.getDistance()) / 2

    def getLeftEncoder(self):
        """Gets the left drive encoder."""
        return self.leftEncoder

    def getRightEncoder(self):
        """Gets the right drive encoder."""
        return self.rightEncoder

    def setMaxOutput(self, maxOutput):
        """Sets the max output of the drive. Useful for scaling the drive to drive more slowly."""
        self.drive.setMaxOutput(maxOutput)

    def zeroHeading(self):
        """Zeroes the heading of the robot."""
        self.gyro.reset()

    def getHeading(self):
        """Returns the heading of the robot."""
        return self.gyro.getRotation2d().degrees()

    def getTurnRate(self):
        """Returns the turn rate of the robot."""
        return -self.gyro.getRate()
