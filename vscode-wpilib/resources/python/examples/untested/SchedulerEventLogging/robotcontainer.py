#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpilib.shuffleboard

import commands2
import commands2.cmd
import commands2.button

import constants


class RobotContainer:
    """
    This class is where the bulk of the robot should be declared. Since Command-based is a
    "declarative" paradigm, very little robot logic should actually be handled in the :class:`.Robot`
    periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
    subsystems, commands, and button mappings) should be declared here.
    """

    def __init__(self) -> None:
        # The driver's controller
        self.driverController = wpilib.XboxController(
            constants.OIConstants.kDriverControllerPort
        )

        # A few commands that do nothing, but will demonstrate the scheduler functionality
        self.instantCommand1 = commands2.InstantCommand()
        self.instantCommand2 = commands2.InstantCommand()
        self.waitCommand = commands2.WaitCommand(5)

        # Set names of commands
        self.instantCommand1.setName("Instant Command 1")
        self.instantCommand2.setName("Instant Command 2")
        self.waitCommand.setName("Wait 5 Seconds Command")

        # Set the scheduler to log Shuffleboard events for command initialize, interrupt, finish
        commands2.CommandScheduler.getInstance().onCommandInitialize(
            lambda command: wpilib.shuffleboard.Shuffleboard.addEventMarker(
                "Command initialized",
                command.getName(),
                wpilib.shuffleboard.ShuffleboardEventImportance.kNormal,
            )
        )
        commands2.CommandScheduler.getInstance().onCommandInterrupt(
            lambda command: wpilib.shuffleboard.Shuffleboard.addEventMarker(
                "Command interrupted",
                command.getName(),
                wpilib.shuffleboard.ShuffleboardEventImportance.kNormal,
            )
        )
        commands2.CommandScheduler.getInstance().onCommandFinish(
            lambda command: wpilib.shuffleboard.Shuffleboard.addEventMarker(
                "Command finished",
                command.getName(),
                wpilib.shuffleboard.ShuffleboardEventImportance.kNormal,
            )
        )

        self.configureButtonBindings()

    def configureButtonBindings(self) -> None:
        """Use this method to define your button->command mappings. Buttons can be created by
        instantiating a {GenericHID} or one of its subclasses
        ({edu.wpi.first.wpilibj.Joystick} or {XboxController}), and then calling passing it to a
        {edu.wpi.first.wpilibj2.command.button.JoystickButton}.
        """
        # Run instant command 1 when the 'A' button is pressed
        commands2.button.JoystickButton(
            self.driverController, wpilib.XboxController.Button.kA
        ).onTrue(self.instantCommand1)
        # Run instant command 2 when the 'X' button is pressed
        commands2.button.JoystickButton(
            self.driverController, wpilib.XboxController.Button.kX
        ).onTrue(self.instantCommand2)
        # Run instant command 3 when the 'Y' button is held; release early to interrupt
        commands2.button.JoystickButton(
            self.driverController, wpilib.XboxController.Button.kY
        ).whileTrue(self.waitCommand)

    def getAutonomousCommand(self) -> commands2.Command:
        """Use this to pass the autonomous command to the main {Robot} class.

        :returns: the command to run in autonomous
        """
        return commands2.InstantCommand()
