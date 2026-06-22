#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpimath
from wpimath import ChassisVelocities
import wpimath.units

import math


class Drivetrain:
    """Represents a differential drive style drivetrain."""

    kMaxSpeed = 3.0  # 3 meters per second
    kMaxAngularSpeed = math.pi  # 1/2 rotation per second

    def __init__(self):
        self.frontLeftMotor = wpilib.PWMSparkMax(1)
        self.frontRightMotor = wpilib.PWMSparkMax(2)
        self.backLeftMotor = wpilib.PWMSparkMax(3)
        self.backRightMotor = wpilib.PWMSparkMax(4)

        self.frontLeftEncoder = wpilib.Encoder(0, 1)
        self.frontRightEncoder = wpilib.Encoder(2, 3)
        self.backLeftEncoder = wpilib.Encoder(4, 5)
        self.backRightEncoder = wpilib.Encoder(6, 7)

        frontLeftLocation = wpimath.Translation2d(0.381, 0.381)
        frontRightLocation = wpimath.Translation2d(0.381, -0.381)
        backLeftLocation = wpimath.Translation2d(-0.381, 0.381)
        backRightLocation = wpimath.Translation2d(-0.381, -0.381)

        self.frontLeftPIDController = wpimath.PIDController(1, 0, 0)
        self.frontRightPIDController = wpimath.PIDController(1, 0, 0)
        self.backLeftPIDController = wpimath.PIDController(1, 0, 0)
        self.backRightPIDController = wpimath.PIDController(1, 0, 0)

        self.gyro = wpilib.AnalogGyro(0)

        self.kinematics = wpimath.MecanumDriveKinematics(
            frontLeftLocation, frontRightLocation, backLeftLocation, backRightLocation
        )

        self.odometry = wpimath.MecanumDriveOdometry(
            self.kinematics, self.gyro.getRotation2d(), self.getCurrentDistances()
        )

        # Gains are for example purposes only - must be determined for your own robot!
        self.feedforward = wpimath.SimpleMotorFeedforwardMeters(1, 3)

        self.gyro.reset()

        # We need to invert one side of the drivetrain so that positive voltages
        # result in both sides moving forward. Depending on how your robot's
        # gearbox is constructed, you might have to invert the left side instead.
        self.frontRightMotor.setInverted(True)
        self.backRightMotor.setInverted(True)

    def getCurrentState(self) -> wpimath.MecanumDriveWheelVelocities:
        """Returns the current state of the drivetrain."""
        return wpimath.kinematics.MecanumDriveWheelSpeeds(
            self.frontLeftEncoder.getRate(),
            self.frontRightEncoder.getRate(),
            self.backLeftEncoder.getRate(),
            self.backRightEncoder.getRate(),
        )

    def getCurrentDistances(self) -> wpimath.MecanumDriveWheelPositions:
        """Returns the current distances measured by the drivetrain."""
        pos = wpimath.MecanumDriveWheelPositions()

        pos.frontLeft = self.frontLeftEncoder.getDistance()
        pos.frontRight = self.frontRightEncoder.getDistance()
        pos.rearLeft = self.backLeftEncoder.getDistance()
        pos.rearRight = self.backRightEncoder.getDistance()

        return pos

    def setSpeeds(self, speeds: wpimath.MecanumDriveWheelVelocities):
        """Sets the desired speeds for each wheel."""
        frontLeftFeedforward = self.feedforward.calculate(speeds.frontLeft)
        frontRightFeedforward = self.feedforward.calculate(speeds.frontRight)
        backLeftFeedforward = self.feedforward.calculate(speeds.rearLeft)
        backRightFeedforward = self.feedforward.calculate(speeds.rearRight)

        frontLeftOutput = self.frontLeftPIDController.calculate(
            self.frontLeftEncoder.getRate(), speeds.frontLeft
        )
        frontRightOutput = self.frontRightPIDController.calculate(
            self.frontRightEncoder.getRate(), speeds.frontRight
        )
        backLeftOutput = self.frontLeftPIDController.calculate(
            self.backLeftEncoder.getRate(), speeds.rearLeft
        )
        backRightOutput = self.frontRightPIDController.calculate(
            self.backRightEncoder.getRate(), speeds.rearRight
        )

        self.frontLeftMotor.setVoltage(frontLeftOutput + frontLeftFeedforward)
        self.frontRightMotor.setVoltage(frontRightOutput + frontRightFeedforward)
        self.backLeftMotor.setVoltage(backLeftOutput + backLeftFeedforward)
        self.backRightMotor.setVoltage(backRightOutput + backRightFeedforward)

    def drive(
        self,
        xSpeed: float,
        ySpeed: float,
        rot: float,
        fieldRelative: bool,
        periodSeconds: float,
    ):
        """Method to drive the robot using joystick info."""
        mecanumDriveWheelSpeeds = self.kinematics.toWheelVelocities(
            ChassisVelocities.discretize(
                (
                    ChassisVelocities.toRobotRelative(
                        xSpeed, ySpeed, rot, self.gyro.getRotation2d()
                    )
                    if fieldRelative
                    else ChassisVelocities(xSpeed, ySpeed, rot)
                ),
                periodSeconds,
            )
        )
        mecanumDriveWheelSpeeds.desaturate(self.kMaxSpeed)
        self.setSpeeds(mecanumDriveWheelSpeeds)

    def updateOdometry(self):
        """Updates the field-relative position."""
        self.odometry.update(self.gyro.getRotation2d(), self.getCurrentDistances())
