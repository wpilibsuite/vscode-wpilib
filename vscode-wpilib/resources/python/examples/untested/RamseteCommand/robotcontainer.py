#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

from wpilib import XboxController
from wpimath.controller import (
    RamseteController,
    PIDController,
    SimpleMotorFeedforwardMeters,
)
from wpimath.geometry import Pose2d, Rotation2d, Translation2d
from wpimath.trajectory.constraint import DifferentialDriveVoltageConstraint
from wpimath.trajectory import TrajectoryConfig, TrajectoryGenerator

from commands2 import InstantCommand, RunCommand, RamseteCommand, cmd
from commands2.button import JoystickButton

from subsystems.driveSubsystem import DriveSubsystem
import constants


class RobotContainer:
    """
    This class is where the bulk of the robot should be declared. Since Command-based is a
    "declarative" paradigm, very little robot logic should actually be handled in the {@link Robot}
    periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
    subsystems, commands, and button mappings) should be declared here.
    """

    def __init__(self):
        # The robot's subsystems
        self.robotDrive = DriveSubsystem()

        # The driver's controller.
        self.driverController = XboxController(constants.kDriverControllerPort)

        # Configure the button bindings
        self.configureButtons()

        # Configure default commands
        # Set the default drive command to split-stick arcade drive
        self.robotDrive.setDefaultCommand(
            # A split-stick arcade command, with forward/backward controlled by the left
            # hand, and turning controlled by the right.
            RunCommand(
                lambda: self.robotDrive.arcadeDrive(
                    -self.driverController.getLeftY(),
                    -self.driverController.getRightX(),
                ),
                self.robotDrive,
            )
        )

    def configureButtons(self):
        """
        Use this method to define your button->command mappings. Buttons can be created by
        instantiating a GenericHID or one of its subclasses (Joystick or XboxController),
        and then calling passing it to a JoystickButton.
        """

        # Drive at half speed when the right bumper is held
        (
            JoystickButton(self.driverController, XboxController.Button.kRightBumper)
            .onTrue(InstantCommand(lambda: self.robotDrive.setMaxOutput(0.5)))
            .onFalse(InstantCommand(lambda: self.robotDrive.setMaxOutput(1)))
        )

    def getAutonomousCommand(self):
        """Use this to pass the autonomous command to the main {@link Robot} class."""

        # Create a voltage constraint to ensure we don't accelerate too fast.
        autoVoltageConstraint = DifferentialDriveVoltageConstraint(
            SimpleMotorFeedforwardMeters(
                constants.ksVolts,
                constants.kvVoltSecondsPerMeter,
                constants.kaVoltSecondsSquaredPerMeter,
            ),
            constants.kDriveKinematics,
            maxVoltage=10,  # 10 volts max.
        )

        # Create config for trajectory
        config = TrajectoryConfig(
            constants.kMaxSpeedMetersPerSecond,
            constants.kMaxAccelerationMetersPerSecondSquared,
        )
        # Add kinematics to ensure max speed is actually obeyed
        config.setKinematics(constants.kDriveKinematics)
        # Apply the voltage constraint
        config.addConstraint(autoVoltageConstraint)

        # An example trajectory to follow. All of these units are in meters.
        self.exampleTrajectory = TrajectoryGenerator.generateTrajectory(
            # Start at the origin facing the +x direction.
            Pose2d(0, 0, Rotation2d(0)),
            # Pass through these two interior waypoints, making an 's' curve path
            [Translation2d(1, 1), Translation2d(2, -1)],
            # End 3 meters straight ahead of where we started, facing forward
            Pose2d(3, 0, Rotation2d(0)),
            # Pass config
            config,
        )

        ramseteCommand = RamseteCommand(
            self.exampleTrajectory,
            self.robotDrive.getPose,
            RamseteController(constants.kRamseteB, constants.kRamseteZeta),
            SimpleMotorFeedforwardMeters(
                constants.ksVolts,
                constants.kvVoltSecondsPerMeter,
                constants.kaVoltSecondsSquaredPerMeter,
            ),
            constants.kDriveKinematics,
            self.robotDrive.getWheelSpeeds,
            PIDController(constants.kPDriveVel, 0, 0),
            PIDController(constants.kPDriveVel, 0, 0),
            # RamseteCommand passes volts to the callback
            self.robotDrive.tankDriveVolts,
            [self.robotDrive],
        )

        # Reset odometry to the initial pose of the trajectory, run path following
        # command, then stop at the end.
        (
            cmd.runOnce(
                lambda: self.robotDrive.resetOdometry(
                    self.exampleTrajectory.initialPose()
                )
            )
            .andThen(ramseteCommand)
            .andThen(cmd.runOnce(lambda: self.robotDrive.tankDriveVolts(0, 0)))
        )
