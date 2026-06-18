#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

#
# This is a pytest based testing system. Anything you can do with
# pytest, you can do with this too. There are a few magic parameters
# provided as fixtures that will allow your tests to access the robot
# code and stuff
#
#    control - a pyfrc.test_support.controller.TestController object
#    robot - This is whatever is returned from the run function in robot.py
#    robot_file - The filename of robot.py
#    robot_path - The directory name that robot.py is located in
#

import wpilib.simulation

import pytest


def test_operator_control(control, robot):
    """
    This test checks to see if a joystick input causes a corresponding
    motor output. Obviously this is a silly example, but you can build
    upon it to make much more comprehensive (and stateful) tests.

    Keep in mind that when you set a value, the robot code does not
    see the value immediately, but only when teleopPeriodic is called,
    which is typically every 20ms
    """

    # run_robot will cause the robot to be initialized and robotInit to be called
    with control.run_robot():
        motorsim = wpilib.simulation.PWMSim(robot.motor.getChannel())
        joysim = wpilib.simulation.JoystickSim(robot.lstick)

        # Set the joystick value to something
        joysim.setY(0.5)

        # Enable the robot, check to see if it was set
        control.step_timing(seconds=0.1, autonomous=False, enabled=True)
        assert 0.5 == pytest.approx(motorsim.getSpeed(), rel=0.01)

        # change it, see if it's still set
        joysim.setY(0.2)
        control.step_timing(seconds=0.1, autonomous=False, enabled=True)
        assert 0.2 == pytest.approx(motorsim.getSpeed(), rel=0.01)
