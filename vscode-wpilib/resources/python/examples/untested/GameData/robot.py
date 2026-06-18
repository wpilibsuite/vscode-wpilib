#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import ntcore

PNUE_MOD_TYPE = wpilib.PneumaticsModuleType.CTREPCM


class MyRobot(wpilib.TimedRobot):
    """
    Example file showing how to get game-data from your driver station / FMS
    """

    def robotInit(self):
        # A way of demonstrating the difference between the game data strings
        self.blue = wpilib.Solenoid(PNUE_MOD_TYPE, 0)
        self.red = wpilib.Solenoid(PNUE_MOD_TYPE, 1)
        self.green = wpilib.Solenoid(PNUE_MOD_TYPE, 2)
        self.yellow = wpilib.Solenoid(PNUE_MOD_TYPE, 3)
        # Set game data to empty string by default
        self.gameData = ""
        # Get the SmartDashboard table from networktables
        self.sd = ntcore.NetworkTableInstance.getDefault().getTable("SmartDashboard")

    def teleopPeriodic(self):
        data = wpilib.DriverStation.getGameSpecificMessage()
        if data:
            # Set the robot gamedata property and set a network tables value
            self.gameData = data
            self.sd.putString("gameData", self.gameData)

        # Solenoid based indicator of the current color
        self.blue.set(self.gameData == "B")
        self.red.set(self.gameData == "R")
        self.green.set(self.gameData == "G")
        self.yellow.set(self.gameData == "Y")
