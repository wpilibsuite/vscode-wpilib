# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

#package org.wpilib.templates.opmode.opmode
import wpilib
from wpilib import PeriodicOpMode
from templates.opmode import robot
#import org.wpilib.opmode.Teleop;

class MyTeleop(PeriodicOpMode):
    def __init__(self, robot):
        super().__init__()
        self.robot = robot
    def disabledPeriodic(self):
       # Called periodically while the robot is disabled
    
    def start(self):
      # Called once when the robot is enabled. 
    
    def periodic(self):
       # Called periodically (set time interval) while the robot is enabled.
    
    def end(self):
       # Called when the robot is disabled (after previously being enabled).
    
    def close(self):
       # Called when the opmode is de-selected / no additional methods will be called.
