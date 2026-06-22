#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpimath
import wpiutil
import wpimath.units

import math


class Drivetrain:
    """Represents a differential drive style drivetrain."""

    MAX_SPEED = 3.0  # meters per second
    MAX_ANGULAR_SPEED = 2 * math.pi  # one rotation per second

    TRACK_WIDTH = 0.381 * 2  # meters
    WHEEL_RADIUS = 0.0508  # meters
    ENCODER_RESOLUTION = 4096  # counts per revolution

    def __init__(self):
        self.left_leader = wpilib.PWMSparkMax(1)
        self.left_follower = wpilib.PWMSparkMax(2)
        self.right_leader = wpilib.PWMSparkMax(3)
        self.right_follower = wpilib.PWMSparkMax(4)

        # Make sure both motors for each side are in the same group
        self.left_leader.addFollower(self.leftFollower)
        self.right_leader.addFollower(self.rightFollower)

        # We need to invert one side of the drivetrain so that positive voltages
        # result in both sides moving forward. Depending on how your robot's
        # gearbox is constructed, you might have to invert the left side instead.
        self.right_leader.setInverted(True)

        self.left_encoder = wpilib.Encoder(0, 1)
        self.right_encoder = wpilib.Encoder(2, 3)

        self.gyro = wpilib.AnalogGyro(0)

        self.left_PID_controller = wpimath.PIDController(1.0, 0.0, 0.0)
        self.right_PID_controller = wpimath.PIDController(1.0, 0.0, 0.0)

        self.kinematics = wpimath.DifferentialDriveKinematics(
            self.TRACK_WIDTH
        )

        # Gains are for example purposes only - must be determined for your own robot!
        self.feedforward = wpimath.SimpleMotorFeedforwardMeters(1, 3)

        self.gyro.reset()

        # Set the distance per pulse for the drive encoders. We can simply use the
        # distance traveled for one rotation of the wheel divided by the encoder
        # resolution.
        self.left_encoder.setDistancePerPulse(
            2 * math.pi * self.WHEEL_RADIUS / self.ENCODER_RESOLUTION
        )
        self.right_encoder.setDistancePerPulse(
            2 * math.pi * self.WHEEL_RADIUS / self.ENCODER_RESOLUTION
        )

        self.left_encoder.reset()
        self.right_encoder.reset()

        self.odometry = wpimath.DifferentialDriveOdometry(
            self.gyro.getRotation2d(),
            self.left_encoder.getDistance(),
            self.right_encoder.getDistance(),
        )

    def setSpeeds(self, speeds: wpimath.DifferentialDriveWheelVelocities):
        """Sets the desired wheel speeds."""
        left_feedforward = self.feedforward.calculate(speeds.left)
        right_feedforward = self.feedforward.calculate(speeds.right)

        left_output = self.left_PID_controller.calculate(
            self.left_encoder.getRate(), speeds.left
        )
        right_output = self.right_PID_controller.calculate(
            self.right_encoder.getRate(), speeds.right
        )

        # Controls the left and right sides of the robot using the calculated outputs
        self.left_leader.setVoltage(left_output + left_feedforward)
        self.right_leader.setVoltage(right_output + right_feedforward)

    def drive(self, xSpeed, rot):
        """Drives the robot with the given linear velocity and angular velocity."""
        wheel_speeds = self.kinematics.toWheelVelocities(
            wpimath.ChassisVelocities(xSpeed, 0, rot)
        )
        self.setSpeeds(wheel_speeds)

    def updateOdometry(self):
        """Updates the field-relative position."""
        self.odometry.update(
            self.gyro.getRotation2d(),
            self.left_encoder.getDistance(),
            self.right_encoder.getDistance(),
        )
