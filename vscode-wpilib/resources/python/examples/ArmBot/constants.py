#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

"""
The constants module is a convenience place for teams to hold robot-wide
numerical or boolean constants. Don't use this for any other purpose!
"""

import math


class DriveConstants:
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

    # Encoder counts per revolution/rotation.
    kEncoderCPR = 1024
    kWheelDiameterInches = 6

    # Assumes the encoders are directly mounted on the wheel shafts
    kEncoderDistancePerPulse = (kWheelDiameterInches * math.pi) / kEncoderCPR


class ArmConstants:
    # NOTE: Please do NOT use these values on your robot.
    kMotorPort = 4
    kP = 1
    kSVolts = 1
    kGVolts = 1
    kVVoltSecondPerRad = 0.5
    kAVoltSecondSquaredPerRad = 0.1

    kMaxVelocityRadPerSecond = 3
    kMaxAccelerationRadPerSecSquared = 10

    kEncoderPorts = (4, 5)
    kEncoderPPR = 256
    kEncoderDistancePerPulse = 2.0 * math.pi / kEncoderPPR

    # The offset of the arm from the horizontal in its neutral position,
    # measured from the horizontal
    kArmOffsetRads = 0.5


class AutoConstants:
    kAutoTimeoutSeconds = 12
    kAutoShootTimeSeconds = 7


class OIConstants:
    kDriverControllerPort = 0
