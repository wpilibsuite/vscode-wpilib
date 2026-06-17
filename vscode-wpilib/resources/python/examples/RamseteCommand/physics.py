#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

#
# See the documentation for more details on how this works
#
# The idea here is you provide a simulation object that overrides specific
# pieces of WPILib, and modifies motors/sensors accordingly depending on the
# state of the simulation. An example of this would be measuring a motor
# moving for a set period of time, and then changing a limit switch to turn
# on after that period of time. This can help you do more complex simulations
# of your robot code without too much extra effort.
#

from wpilib import RobotController, ADXRS450_Gyro
from wpilib.simulation import (
    PWMSim,
    DifferentialDrivetrainSim,
    EncoderSim,
    AnalogGyroSim,
)
from wpimath.system.plant import DCMotor, LinearSystemId

import constants

from pyfrc.physics.core import PhysicsInterface

import typing

if typing.TYPE_CHECKING:
    from robot import MyRobot


class PhysicsEngine:
    """
    Simulates a motor moving something that strikes two limit switches,
    one on each end of the track. Obviously, this is not particularly
    realistic, but it's good enough to illustrate the point
    """

    def __init__(self, physics_controller: PhysicsInterface, robot: "MyRobot"):
        self.physics_controller = physics_controller

        # Motor simulation definitions. Each correlates to a motor defined in
        # the drivetrain subsystem.
        self.frontLeftMotor = PWMSim(constants.kLeftMotor1Port)
        self.backLeftMotor = PWMSim(constants.kLeftMotor2Port)
        self.frontRightMotor = PWMSim(constants.kRightMotor1Port)
        self.backRightMotor = PWMSim(constants.kRightMotor2Port)

        self.system = LinearSystemId.identifyDrivetrainSystem(
            constants.kvVoltSecondsPerMeter,  # The linear velocity gain in volt seconds per distance.
            constants.kaVoltSecondsSquaredPerMeter,  # The linear acceleration gain, in volt seconds^2 per distance.
            1.5,  # The angular velocity gain, in volt seconds per angle.
            0.3,  # The angular acceleration gain, in volt seconds^2 per angle.
        )

        # The simulation model of the drivetrain.
        self.drivesim = DifferentialDrivetrainSim(
            # The state-space model for a drivetrain.
            self.system,
            # The robot's trackwidth, which is the distance between the wheels on the left side
            # and those on the right side. The units is meters.
            constants.kTrackWidthMeters,
            # Four NEO drivetrain setup.
            DCMotor.NEO(constants.kDrivetrainMotorCount),
            # One to one output gearing.
            1,
            # The radius of the drivetrain wheels in meters.
            (constants.kWheelDiameterMeters / 2),
        )

        self.leftEncoderSim = EncoderSim(robot.robotContainer.robotDrive.leftEncoder)
        self.rightEncoderSim = EncoderSim(robot.robotContainer.robotDrive.rightEncoder)

        self.gyro = AnalogGyroSim(robot.robotContainer.robotDrive.gyro)

    def update_sim(self, now: float, tm_diff: float) -> None:
        """
        Called when the simulation parameters for the program need to be
        updated.

        :param now: The current time as a float
        :param tm_diff: The amount of time that has passed since the last
                        time that this function was called
        """

        # Simulate the drivetrain
        l_motor = self.frontLeftMotor.getSpeed()
        r_motor = self.frontRightMotor.getSpeed()

        self.gyro.setAngle(-self.drivesim.getHeading().degrees())

        voltage = RobotController.getInputVoltage()
        self.drivesim.setInputs(l_motor * voltage, -r_motor * voltage)
        self.drivesim.update(tm_diff)

        self.leftEncoderSim.setDistance(self.drivesim.getLeftPosition())
        self.leftEncoderSim.setRate(self.drivesim.getLeftVelocity())
        self.rightEncoderSim.setDistance(self.drivesim.getRightPosition())
        self.rightEncoderSim.setRate(self.drivesim.getRightVelocity())

        self.physics_controller.field.setRobotPose(self.drivesim.getPose())
