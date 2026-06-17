#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import commands2
import commands2.cmd
import commands2.button
import wpimath

import constants
import subsystems.drivesubsystem
import commands.drivedistanceprofiled


class RobotContainer:
    """
    This class is where the bulk of the robot should be declared. Since Command-based is a
    "declarative" paradigm, very little robot logic should actually be handled in the :class:`.Robot`
    periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
    subsystems, commands, and button mappings) should be declared here.

    """

    def __init__(self):
        # The robot's subsystems
        self.robotDrive = subsystems.drivesubsystem.DriveSubsystem()

        # Retained command references
        self.driveFullSpeed = commands2.cmd.runOnce(
            lambda: self.robotDrive.setMaxOutput(1), self.robotDrive
        )
        self.driveHalfSpeed = commands2.cmd.runOnce(
            lambda: self.robotDrive.setMaxOutput(0.5), self.robotDrive
        )

        # The driver's controller
        self.driverController = commands2.button.CommandXboxController(
            constants.OIConstants.kDriverControllerPort
        )

        # Configure the button bindings
        self.configureButtonBindings()

        # Configure default commands
        # Set the default drive command to split-stick arcade drive
        self.robotDrive.setDefaultCommand(
            # A split-stick arcade command, with forward/backward controlled by the left
            # hand, and turning controlled by the right.
            commands2.cmd.run(
                lambda: self.robotDrive.arcadeDrive(
                    -self.driverController.getLeftY(),
                    -self.driverController.getRightX(),
                ),
                self.robotDrive,
            )
        )

    def configureButtonBindings(self):
        """
        Use this method to define your button->command mappings. Buttons can be created via the button
        factories on commands2.button.CommandGenericHID or one of its
        subclasses (commands2.button.CommandJoystick or command2.button.CommandXboxController).
        """

        # Configure your button bindings here

        # We can bind commands while retaining references to them in RobotContainer

        # Drive at half speed when the bumper is held
        self.driverController.rightBumper().onTrue(self.driveHalfSpeed).onFalse(
            self.driveFullSpeed
        )

        # Drive forward by 3 meters when the 'A' button is pressed, with a timeout of 10 seconds
        self.driverController.a().onTrue(
            commands.drivedistanceprofiled.DriveDistanceProfiled(
                3, self.robotDrive
            ).withTimeout(10)
        )

        # Do the same thing as above when the 'B' button is pressed, but defined inline
        self.driverController.b().onTrue(
            commands2.TrapezoidProfileCommand(
                wpimath.TrapezoidProfile(
                    # Limit the max acceleration and velocity
                    wpimath.TrapezoidProfile.Constraints(
                        constants.DriveConstants.kMaxSpeedMetersPerSecond,
                        constants.DriveConstants.kMaxAccelerationMetersPerSecondSquared,
                    ),
                ),
                # Pipe the profile state to the drive
                lambda setpointState: self.robotDrive.setDriveStates(
                    setpointState, setpointState
                ),
                # End at desired position in meters; implicitly starts at 0
                lambda: wpimath.TrapezoidProfile.State(3, 0),
                wpimath.TrapezoidProfile.State,
                self.robotDrive,
            )
            .beforeStarting(self.robotDrive.resetEncoders)
            .withTimeout(10)
        )

    def getAutonomousCommand(self) -> commands2.Command:
        """
        Use this to pass the autonomous command to the main :class:`.Robot` class.

        :returns: the command to run in autonomous
        """
        return commands2.cmd.none()
