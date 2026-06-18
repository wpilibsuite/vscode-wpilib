#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import typing

import wpilib.simulation
from wpimath.system import plant

from pyfrc.physics.core import PhysicsInterface

if typing.TYPE_CHECKING:
    from robot import MyRobot


class PhysicsEngine:
    """
    Simulates a flywheel
    """

    def __init__(self, physics_controller: PhysicsInterface, robot: "MyRobot"):
        """
        :param physics_controller: `pyfrc.physics.core.Physics` object
                                   to communicate simulation effects to
        """

        self.physics_controller = physics_controller

        # Motors
        self.flywheelMotor = wpilib.simulation.PWMSim(robot.flywheelMotor.getChannel())

        # Sensors
        self.encoder = wpilib.simulation.EncoderSim(robot.encoder)

        # Flywheel
        self.gearbox = plant.DCMotor.NEO(1)
        self.plant = plant.LinearSystemId.flywheelSystem(
            self.gearbox, robot.kFlywheelGearing, robot.kFlywheelMomentOfInertia
        )
        self.flywheel = wpilib.simulation.FlywheelSim(self.plant, self.gearbox)

    def update_sim(self, now: float, tm_diff: float) -> None:
        """
        Called when the simulation parameters for the program need to be
        updated.

        :param now: The current time as a float
        :param tm_diff: The amount of time that has passed since the last
                        time that this function was called
        """

        # To update our simulation, we set motor voltage inputs, update the
        # simulation, and write the simulated velocities to our simulated encoder
        self.flywheel.setInputVoltage(
            self.flywheelMotor.getSpeed() * wpilib.RobotController.getInputVoltage()
        )
        self.flywheel.update(tm_diff)
        self.encoder.setRate(self.flywheel.getAngularVelocity())
