#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

"""
A place for the constant values in the code that may be used in more than one place. 
This offers a convenient resources to teams who need to make both quick and universal
changes.
"""

import math


class DriveConstants:
    k_left_motor1_port = 0
    k_left_motor2_port = 1
    k_right_motor1_port = 2
    k_right_motor2_port = 3

    """
    These are example values only - DO NOT USE THESE FOR YOUR OWN ROBOT!
    These characterization values MUST be determined either experimentally or theoretically
    for *your* robot's drive.
    The SysId tool provides a convenient method for obtaining these values for your robot.
    """
    ks_volts = 1
    kv_volt_seconds_per_meter = 0.8
    ka_volt_seconds_squared_per_meter = 0.15

    kp = 1

    k_max_speed_meters_per_second = 3
    k_max_acceleration_meters_per_second_squared = 3


class OIConstants:
    k_driver_controller_port = 0
