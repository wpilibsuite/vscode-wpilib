#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

#
# See the documentation for more details on how this works
#
# Documentation can be found at https://robotpy.readthedocs.io/projects/pyfrc/en/latest/physics.html
#
# The idea here is you provide a simulation object that overrides specific
# pieces of WPILib, and modifies motors/sensors accordingly depending on the
# state of the simulation. An example of this would be measuring a motor
# moving for a set period of time, and then changing a limit switch to turn
# on after that period of time. This can help you do more complex simulations
# of your robot code without too much extra effort.
#
# Examples can be found at https://github.com/robotpy/examples

import wpilib
import wpilib.simulation

import wpimath.system.plant
from pyfrc.physics.core import PhysicsInterface

import typing

if typing.TYPE_CHECKING:
    from robot import MyRobot


class PhysicsEngine:
    def __init__(self, physics_controller: PhysicsInterface, robot: "MyRobot"):
        """
        :param physics_controller: `pyfrc.physics.core.Physics` object
                                   to communicate simulation effects to
        :param robot: your robot object
        """

        self.physics_controller = physics_controller

        # This gearbox represents a gearbox containing 4 Vex 775pro motors.
        self.elevatorGearbox = wpimath.system.plant.DCMotor.vex775Pro(4)

        # Simulation classes help us simulate what's going on, including gravity.
        self.elevatorSim = wpilib.simulation.ElevatorSim(
            self.elevatorGearbox,
            robot.kElevatorGearing,
            robot.kCarriageMass,
            robot.kElevatorDrumRadius,
            robot.kMinElevatorHeight,
            robot.kMaxElevatorHeight,
            True,
            0,
            [0.01, 0.0],
        )
        self.encoderSim = wpilib.simulation.EncoderSim(robot.encoder)
        self.motorSim = wpilib.simulation.PWMSim(robot.motor.getChannel())

        # Create a Mechanism2d display of an elevator
        self.mech2d = wpilib.Mechanism2d(20, 50)
        self.elevatorRoot = self.mech2d.getRoot("Elevator Root", 10, 0)
        self.elevatorMech2d = self.elevatorRoot.appendLigament(
            "Elevator", self.elevatorSim.getPositionInches(), 90
        )

        # Put Mechanism to SmartDashboard
        wpilib.SmartDashboard.putData("Elevator Sim", self.mech2d)

    def update_sim(self, now: float, tm_diff: float) -> None:
        """
        Called when the simulation parameters for the program need to be
        updated.

        :param now: The current time as a float
        :param tm_diff: The amount of time that has passed since the last
                        time that this function was called
        """

        # First, we set our "inputs" (voltages)
        self.elevatorSim.setInput(
            0, self.motorSim.getSpeed() * wpilib.RobotController.getInputVoltage()
        )

        # Next, we update it
        self.elevatorSim.update(tm_diff)

        # Finally, we set our simulated encoder's readings and simulated battery
        # voltage
        self.encoderSim.setDistance(self.elevatorSim.getPosition())
        # SimBattery estimates loaded battery voltage
        # wpilib.simulation.RoboRioSim.setVInVoltage(
        #     wpilib.simulation.BatterySim
        # )

        # Update the Elevator length based on the simulated elevator height
        self.elevatorMech2d.setLength(self.elevatorSim.getPositionInches())
