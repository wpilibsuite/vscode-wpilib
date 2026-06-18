#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
from wpilib.drive import DifferentialDrive
from wpilib.shuffleboard import Shuffleboard


class MyRobot(wpilib.TimedRobot):
    """
    This sample program provides an example for ShuffleBoard, an alternative
    to SmartDashboard for displaying values and properties of different robot
    parts.

    ShuffleBoard can use pre-programmed widgets to display various values, such
    as Boolean Boxes, Sliders, Graphs, and more. In addition, they can display
    things in various Tabs.

    For more information on how to create personal layouts and more in
    ShuffleBoard, feel free to reference the official FIRST WPILib documentation
    online.
    """

    def robotInit(self):
        self.left = wpilib.PWMSparkMax(0)
        self.right = wpilib.PWMSparkMax(1)
        self.elevatorMotor = wpilib.PWMSparkMax(2)

        self.robotDrive = DifferentialDrive(self.left, self.right)

        self.stick = wpilib.Joystick(0)

        self.leftEncoder = wpilib.Encoder(0, 1)
        self.rightEncoder = wpilib.Encoder(2, 3)
        self.elevatorPot = wpilib.AnalogPotentiometer(0)

        # Add a 'max speed' widget to a tab named 'Configuration', using a number slider
        # The widget will be placed in the second column and row and will be two columns wide
        self.maxSpeed = (
            Shuffleboard.getTab("Configuration")
            .add(title="Max Speed", defaultValue=1)
            .withWidget("Number Slider")
            .withPosition(1, 1)
            .withSize(2, 1)
            .getEntry()
        )

        # Create a 'DriveBase' tab and add the drivetrain object to it.
        driveBaseTab = Shuffleboard.getTab("Drivebase")
        driveBaseTab.add(title="Tank Drive", defaultValue=self.robotDrive)
        # Put both encoders in a list layout
        encoders = (
            driveBaseTab.getLayout(type="List Layout", title="Encoders")
            .withPosition(0, 0)
            .withSize(2, 2)
        )
        encoders.add(title="Left Encoder", defaultValue=self.leftEncoder)
        encoders.add(title="Right Encoder", defaultValue=self.rightEncoder)

        # Create a 'Elevator' tab and add the potentiometer and elevator motor to it
        elevatorTab = Shuffleboard.getTab("Elevator")
        elevatorTab.add(title="Motor", defaultValue=self.elevatorMotor)
        elevatorTab.add(title="Potentiometer", defaultValue=self.elevatorPot)

    def autonomousInit(self):
        # Read the value of the 'max speed' widget from the dashboard
        self.robotDrive.setMaxOutput(self.maxSpeed.getDouble(1.0))
