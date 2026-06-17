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

from wpilib.simulation import (
    PWMSim,
    DifferentialDrivetrainSim,
    EncoderSim,
    AnalogGyroSim,
)

from wpilib import RobotController

from wpimath.geometry import Transform2d

from wpimath.system import LinearSystemId
from wpimath.system.plant import DCMotor

from pyfrc.physics import drivetrains
from pyfrc.physics.core import PhysicsInterface
from pyfrc.physics.visionsim import VisionSim, VisionSimTarget

from networktables.util import ntproperty

import typing

if typing.TYPE_CHECKING:
    from robot import MyRobot


class PhysicsEngine:
    """
    Simulates a motor moving something that strikes two limit switches,
    one on each end of the track. Obviously, this is not particularly
    realistic, but it's good enough to illustrate the point
    """

    # array of (found, timestamp, angle)
    target = ntproperty("/camera/target", (0.0, float("inf"), 0.0))

    def __init__(self, physics_controller: PhysicsInterface, robot: "MyRobot"):
        """
        :param physics_controller: `pyfrc.physics.core.PhysicsInterface` object
                                   to communicate simulation effects to
        """

        self.physics_controller = physics_controller
        self.position = 0

        targets = [
            # right
            VisionSimTarget(15, 13, 250, 0),
            # middle
            VisionSimTarget(16.5, 15.5, 295, 65),
            # left
            VisionSimTarget(15, 18, 0, 110),
        ]

        self.vision = VisionSim(
            targets, 61.0, 1.5, 15, 15, physics_controller=physics_controller
        )

        # Simulate the drivetrain.
        self.drivetrain = drivetrains.TwoMotorDrivetrain(
            deadzone=drivetrains.linear_deadzone(0.1)
        )

        # Create the motors.
        self.l_motor = PWMSim(robot.leftMotor.getChannel())
        self.r_motor = PWMSim(robot.rightMotor.getChannel())

        self.gyroSim = AnalogGyroSim(robot.gyro)

        self.system = LinearSystemId.identifyDrivetrainSystem(1.98, 0.2, 1.5, 0.3)
        self.drivesim = DifferentialDrivetrainSim(
            self.system,
            0.762,
            DCMotor.CIM(2),
            8,
            0.0508,
        )

        self.leftEncoderSim = EncoderSim(robot.leftEncoder)
        self.rightEncoderSim = EncoderSim(robot.rightEncoder)

    def update_sim(self, now: float, tm_diff: float) -> None:
        """
        Called when the simulation parameters for the program need to be
        updated.

        :param now: The current time as a float
        :param tm_diff: The amount of time that has passed since the last
                        time that this function was called
        """

        l_speed = self.l_motor.getSpeed()
        r_speed = self.r_motor.getSpeed()

        voltage = RobotController.getInputVoltage()

        self.drivesim.setInputs(l_speed * voltage, r_speed * voltage)
        self.drivesim.update(tm_diff)

        self.leftEncoderSim.setDistance(self.drivesim.getLeftPosition() * 39.37)
        self.leftEncoderSim.setRate(self.drivesim.getLeftVelocity() * 39.37)
        self.rightEncoderSim.setDistance(self.drivesim.getRightPosition() * 39.37)
        self.rightEncoderSim.setRate(self.drivesim.getRightVelocity() * 39.37)

        self.physics_controller.field.setRobotPose(self.drivesim.getPose())

        pose = self.drivesim.getPose()

        currentTranslation = pose.translation()
        currentRotation = pose.rotation()

        x = currentTranslation.X()
        y = currentTranslation.Y()

        angle = currentRotation.radians()

        data = self.vision.compute(now, x, y, angle)

        if data is not None:
            self.target = data[0][:3]
