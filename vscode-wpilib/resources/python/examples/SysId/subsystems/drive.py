#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

from commands2 import Command, Subsystem
from commands2.sysid import SysIdRoutine
from wpilib.sysid import SysIdRoutineLog

from wpilib import Encoder, PWMSparkMax, RobotController
from wpilib import DifferentialDrive

from wpimath.units import volts

from constants import DriveConstants

from typing import Callable


class Drive(Subsystem):
    def __init__(self) -> None:
        # The motors on the left side of the drive
        self.left_motor = PWMSparkMax(DriveConstants.kLeftMotor1Port)
        self.left_motor.addFollower(PWMSparkMax(DriveConstants.kLeftMotor2Port))

        # The motors on the right side of the drive
        self.right_motor = PWMSparkMax(DriveConstants.kRightMotor1Port)
        self.right_motor.addFollower(PWMSparkMax(DriveConstants.kRightMotor2Port))

        # At least one side of the drive train needs to be inverted. This ensures that positive voltages sent to each motor group result in forward motion.
        self.right_motor.setInverted(True)

        # The robot's drive
        self.drive = DifferentialDrive(self.left_motor, self.right_motor)

        # The left-side drive encoder
        self.left_encoder = Encoder(
            DriveConstants.kLeftEncoderPorts[0],
            DriveConstants.kLeftEncoderPorts[1],
            DriveConstants.kLeftEncoderReversed,
        )

        # The right-side drive encoder
        self.right_encoder = Encoder(
            DriveConstants.kRightEncoderPorts[0],
            DriveConstants.kRightEncoderPorts[1],
            DriveConstants.kRightEncoderReversed,
        )

        # Sets the distance per pulse for the encoders
        self.left_encoder.setDistancePerPulse(DriveConstants.kEncoderDistancePerPulse)
        self.right_encoder.setDistancePerPulse(DriveConstants.kEncoderDistancePerPulse)

        # Tell SysId how to plumb the driving voltage to the motors.
        def drive(voltage: volts) -> None:
            self.left_motor.setVoltage(voltage)
            self.right_motor.setVoltage(voltage)

        # Tell SysId to make generated commands require this subsystem, suffix test state in
        # WPILog with this subsystem's name ("drive")
        self.sys_id_routine = SysIdRoutine(
            SysIdRoutine.Config(),
            SysIdRoutine.Mechanism(drive, self.log, self),
        )

    # Tell SysId how to record a frame of data for each motor on the mechanism being
    # characterized.
    def log(self, sys_id_routine: SysIdRoutineLog) -> None:
        # Record a frame for the left motors.  Since these share an encoder, we consider
        # the entire group to be one motor.
        sys_id_routine.motor("drive-left").voltage(
            self.left_motor.get() * RobotController.getBatteryVoltage()
        ).position(self.left_encoder.getDistance()).velocity(
            self.left_encoder.getRate()
        )
        # Record a frame for the right motors.  Since these share an encoder, we consider
        # the entire group to be one motor.
        sys_id_routine.motor("drive-right").voltage(
            self.right_motor.get() * RobotController.getBatteryVoltage()
        ).position(self.right_encoder.getDistance()).velocity(
            self.right_encoder.getRate()
        )

    def arcadeDriveCommand(
        self, fwd: Callable[[], float], rot: Callable[[], float]
    ) -> Command:
        """Returns a command that drives the robot with arcade controls.

        :param fwd: the commanded forward movement
        :param rot: the commanded rotation
        """

        # A split-stick arcade command, with forward/backward controlled by the left
        # hand, and turning controlled by the right.
        return self.run(lambda: self.drive.arcadeDrive(fwd(), rot()))

    def sysIdQuasistatic(self, direction: SysIdRoutine.Direction) -> Command:
        return self.sys_id_routine.quasistatic(direction)

    def sysIdDynamic(self, direction: SysIdRoutine.Direction) -> Command:
        return self.sys_id_routine.dynamic(direction)
