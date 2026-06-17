#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

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
    kEncoderCPR = 1024.0
    kWheelDiameterInches = 6.0

    # Assumes the encoders are directly mounted on the wheel shafts
    kEncoderDistancePerPulse = (kWheelDiameterInches * math.pi) / kEncoderCPR


# autonomous
class AutonomousConstants:
    kTimeoutSeconds = 3.0
    kDriveDistanceMetres = 2.0
    kDriveSpeed = 0.5


class OIConstants:
    kDriverControllerPort = 0
