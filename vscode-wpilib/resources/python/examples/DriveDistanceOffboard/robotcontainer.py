#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#
import wpilib
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
        self.robot_drive = subsystems.drivesubsystem.DriveSubsystem()

        # Retained command references
        self.drive_full_speed = commands2.cmd.runOnce(
            lambda: self.robot_drive.setMaxOutput(1), self.robot_drive
        )
        self.drive_half_speed = commands2.cmd.runOnce(
            lambda: self.robot_drive.setMaxOutput(0.5), self.robot_drive
        )

        # The driver's controller
        self.driver_controller = commands2.button.CommandNiDsXboxController(
            constants.OIConstants.k_driver_controller_port
        )

        # Configure the button bindings
        self.configureButtonBindings()

        # Configure default commands
        # Set the default drive command to split-stick arcade drive
        self.robot_drive.setDefaultCommand(
            # A split-stick arcade command, with forward/backward controlled by the left
            # hand, and turning controlled by the right.
            commands2.cmd.run(
                lambda: self.robot_drive.arcadeDrive(
                    -self.driver_controller.getLeftY(),
                    -self.driver_controller.getRightX(),
                ),
                self.robot_drive,
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
        self.driver_controller.rightBumper().onTrue(self.drive_half_speed).onFalse(
            self.drive_full_speed
        )

        # Drive forward by 3 meters when the 'A' button is pressed, with a timeout of 10 seconds
        self.driver_controller.a().onTrue(
            commands.drivedistanceprofiled.DriveDistanceProfiled(
                3, self.robot_drive
            ).withTimeout(10)
        )

        # Do the same thing as above when the 'B' button is pressed, but defined inline
        self.driver_controller.b().onTrue(
            commands2.TrapezoidProfileCommand(
                wpimath.TrapezoidProfile(
                    # Limit the max acceleration and velocity
                    wpimath.TrapezoidProfile.Constraints(
                        constants.DriveConstants.k_max_speed_meters_per_second,
                        constants.DriveConstants.k_max_acceleration_meters_per_second_squared,
                    ),
                ),
                # Pipe the profile state to the drive
                lambda setpoint_state: self.robot_drive.setDriveStates(
                    setpoint_state, setpoint_state
                ),
                # End at desired position in meters; implicitly starts at 0
                lambda: wpimath.TrapezoidProfile.State(3, 0),
                wpimath.TrapezoidProfile.State,
                self.robot_drive,
            )
            .beforeStarting(self.robot_drive.resetEncoders)
            .withTimeout(10)
        )

    def getAutonomousCommand(self) -> commands2.Command:
        """
        Use this to pass the autonomous command to the main :class:`.Robot` class.

        :returns: the command to run in autonomous
        """
        return commands2.cmd.none()
