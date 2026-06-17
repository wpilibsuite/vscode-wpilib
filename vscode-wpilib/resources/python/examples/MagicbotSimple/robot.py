#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
from magicbot import MagicRobot

from components.component1 import Component1
from components.component2 import Component2


class MyRobot(MagicRobot):
    #
    # Define components here
    #

    component1: Component1
    component2: Component2

    # You can even pass constants to components
    SOME_CONSTANT = 1

    def createObjects(self):
        """Initialize all wpilib motors & sensors"""

        # TODO: create button example here

        self.component1_motor = wpilib.Talon(1)
        self.some_motor = wpilib.Talon(2)

        self.joystick = wpilib.Joystick(0)

    #
    # No autonomous routine boilerplate required here, anything in the
    # autonomous folder will automatically get added to a list
    #

    def teleopPeriodic(self):
        """Place code here that does things as a result of operator
        actions"""

        try:
            if self.joystick.getTrigger():
                self.component2.do_something()
        except:
            self.onException()
