#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import commands2
import commands2.cmd
import commands2.button

import constants
import subsystems.drivesubsystem
import subsystems.shootersubsystem


class RobotContainer:
    """
    This class is where the bulk of the robot should be declared. Since Command-based is a
    "declarative" paradigm, very little robot logic should actually be handled in the :class:`.Robot`
    periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
    subsystems, commands, and button mappings) should be declared here.

    """

    def __init__(self):
        self.robotDrive = subsystems.drivesubsystem.DriveSubsystem()
        self.shooter = subsystems.shootersubsystem.ShooterSubsystem()

        self.spinUpShooter = commands2.cmd.runOnce(self.shooter.enable, self.shooter)
        self.stopShooter = commands2.cmd.runOnce(self.shooter.disable, self.shooter)

        # An autonomous routine that shoots the loaded frisbees
        self.autonomousCommand = commands2.cmd.sequence(
            # Start the command by spinning up the shooter...
            commands2.cmd.runOnce(self.shooter.enable, self.shooter),
            # Wait until the shooter is at speed before feeding the frisbees
            commands2.cmd.waitUntil(lambda: self.shooter.getController().atSetpoint()),
            # Start running the feeder
            commands2.cmd.runOnce(self.shooter.runFeeder, self.shooter),
            # Shoot for the specified time
            commands2.cmd.waitSeconds(constants.AutoConstants.kAutoShootTimeSeconds)
            # Add a timeout (will end the command if, for instance, the shooter
            # never gets up to speed)
            .withTimeout(constants.AutoConstants.kAutoTimeoutSeconds)
            # When the command ends, turn off the shooter and the feeder
            .andThen(
                commands2.cmd.runOnce(
                    lambda: self.shooter.disable, self.shooter
                ).andThen(
                    commands2.cmd.runOnce(lambda: self.shooter.stopFeeder, self.shooter)
                )
            ),
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

        # Spin up the shooter when the 'A' button is pressed
        self.driverController.a().onTrue(self.spinUpShooter)

        # Turn off the shooter when the 'B' button is pressed
        self.driverController.b().onTrue(self.stopShooter)

        # We can also write them as temporary variables outside the bindings

        # Shoots if the shooter wheel has reached the target speed
        shoot = commands2.cmd.either(
            # Run the feeder
            commands2.cmd.runOnce(self.shooter.runFeeder, self.shooter),
            # Do nothing
            commands2.cmd.none(),
            # Determine which of the above to do based on whether the shooter has reached the
            # desired speed
            lambda: self.shooter.getController().atSetpoint(),
        )

        stopFeeder = commands2.cmd.runOnce(self.shooter.stopFeeder, self.shooter)

        # Shoot when the 'X' button is pressed
        self.driverController.x().onTrue(shoot).onFalse(stopFeeder)

        # We can also define commands inline at the binding!

        # While holding the shoulder button, drive at half speed
        self.driverController.rightBumper().onTrue(
            commands2.cmd.runOnce(
                lambda: self.robotDrive.setMaxOutput(0.5), self.robotDrive
            )
        ).onFalse(
            commands2.cmd.runOnce(
                lambda: self.robotDrive.setMaxOutput(1), self.robotDrive
            )
        )

    def getAutonomousCommand(self) -> commands2.Command:
        """
        Use this to pass the autonomous command to the main :class:`.Robot` class.

        :returns: the command to run in autonomous
        """
        return self.autonomousCommand
