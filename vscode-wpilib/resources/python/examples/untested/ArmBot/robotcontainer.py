#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import commands2
import commands2.button
import commands2.cmd

import constants

from subsystems.armsubsystem import ArmSubsystem
from subsystems.drivesubsystem import DriveSubsystem


class RobotContainer:
    """
    This class is where the bulk of the robot should be declared. Since Command-based is a
    "declarative" paradigm, very little robot logic should actually be handled in the :class:`.Robot`
    periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
    subsystems, commands, and button mappings) should be declared here.
    """

    def __init__(self) -> None:
        # The robot's subsystems
        self.robot_drive = DriveSubsystem()
        self.robot_arm = ArmSubsystem()

        # The driver's controller
        self.driver_controller = commands2.button.CommandXboxController(
            constants.OIConstants.kDriverControllerPort
        )

        # Configure the button bindings
        self.configureButtonBindings()

        # Set the default drive command
        # Set the default drive command to split-stick arcade drive
        self.robot_drive.setDefaultCommand(
            commands2.cmd.run(
                # A split-stick arcade command, with forward/backward controlled by the left
                # hand, and turning controlled by the right.
                lambda: self.robot_drive.arcadeDrive(
                    -self.driver_controller.getLeftY(),
                    -self.driver_controller.getRightX(),
                ),
                self.robot_drive,
            )
        )

    def configureButtonBindings(self) -> None:
        """
        Use this method to define your button->command mappings. Buttons can be created by
        instantiating a :GenericHID or one of its subclasses (Joystick or XboxController),
        and then passing it to a JoystickButton.
        """

        # Move the arm to 2 radians above horizontal when the 'A' button is pressed.
        self.driver_controller.a().onTrue(
            commands2.cmd.run(lambda: self.moveArm(2), self.robot_arm)
        )

        # Move the arm to neutral position when the 'B' button is pressed
        self.driver_controller.b().onTrue(
            commands2.cmd.run(
                lambda: self.moveArm(constants.ArmConstants.kArmOffsetRads),
                self.robot_arm,
            )
        )

        # Disable the arm controller when Y is pressed
        self.driver_controller.y().onTrue(
            commands2.cmd.runOnce(lambda: self.robot_arm.disable())
        )

        # Drive at half speed when the bumper is held
        self.driver_controller.rightTrigger().onTrue(
            commands2.cmd.runOnce(lambda: self.robot_drive.setMaxOutput(0.5))
        )
        self.driver_controller.rightTrigger().onFalse(
            commands2.cmd.runOnce(lambda: self.robot_drive.setMaxOutput(1.0))
        )

    def disablePIDSubsystems(self) -> None:
        """Disables all ProfiledPIDSubsystem and PIDSubsystem instances.
        This should be called on robot disable to prevent integral windup."""
        self.robot_arm.disable()

    def getAutonomousCommand(self) -> commands2.Command:
        """Use this to pass the autonomous command to the main {@link Robot} class.

        :returns: the command to run in autonomous
        """
        return commands2.cmd.none()

    def moveArm(self, radians: float) -> None:
        self.robot_arm.setGoal(radians)
        self.robot_arm.enable()
