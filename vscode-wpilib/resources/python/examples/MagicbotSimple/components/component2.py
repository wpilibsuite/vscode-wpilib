#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
from .component1 import Component1

from magicbot import feedback, will_reset_to


class Component2:
    component1: Component1
    some_motor: wpilib.Talon

    # This is changed to the value in robot.py
    SOME_CONSTANT: int

    # This gets reset after each invocation of execute()
    did_something = will_reset_to(False)

    def on_enable(self):
        """Called when the robot enters teleop or autonomous mode"""
        self.logger.info(
            "Robot is enabled: I have SOME_CONSTANT=%s", self.SOME_CONSTANT
        )

    def do_something(self):
        self.did_something = True

    # Use @feedback to send state external to the robot code to NetworkTables.
    # This will be called after execute().
    @feedback
    def get_motor_voltage(self) -> float:
        return self.some_motor.getVoltage()

    def execute(self):
        if self.did_something:
            self.some_motor.set(1)
        else:
            self.some_motor.set(0)
