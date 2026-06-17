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

from wpimath.kinematics import DifferentialDriveKinematics

import math

# ID for the driver's joystick.
kDriverControllerPort = 0

# The PWM IDs for the drivetrain motor controllers.
kLeftMotor1Port = 0
kLeftMotor2Port = 1
kRightMotor1Port = 2
kRightMotor2Port = 3

# Encoders and their respective motor controllers.
kLeftEncoderPorts = (0, 1)
kRightEncoderPorts = (2, 3)
kLeftEncoderReversed = False
kRightEncoderReversed = True

# In meters, distance between wheels on each side of robot.
kTrackWidthMeters = 0.69
kDriveKinematics = DifferentialDriveKinematics(kTrackWidthMeters)

# Encoder counts per revolution/rotation.
kEncoderCPR = 1024
kWheelDiameterMeters = 0.15

# Assumes the encoders are directly mounted on the wheel shafts
kEncoderDistancePerPulse = (kWheelDiameterMeters * math.pi) / kEncoderCPR

# These are example values only - DO NOT USE THESE FOR YOUR OWN ROBOT!
# These characterization values MUST be determined either experimentally or theoretically
# for *your* robot's drive.
# The Robot Characterization Toolsuite provides a convenient tool for obtaining these
# values for your robot.
ksVolts = 0.22
kvVoltSecondsPerMeter = 1.98
kaVoltSecondsSquaredPerMeter = 0.2

# Example value only - as above, this must be tuned for your drive!
kPDriveVel = 8.5

# The max velocity and acceleration for our autonomous.
kMaxSpeedMetersPerSecond = 3
kMaxAccelerationMetersPerSecondSquared = 1

# Reasonable baseline values for a RAMSETE follower in units of meters and seconds.
kRamseteB = 2
kRamseteZeta = 0.7

# The number of motors on the robot.
kDrivetrainMotorCount = 4
