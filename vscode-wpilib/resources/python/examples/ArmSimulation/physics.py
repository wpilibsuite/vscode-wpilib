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

import math
import typing

if typing.TYPE_CHECKING:
    from robot import MyRobot

from constants import Constants


class PhysicsEngine:
    """
    Simulates a 4-wheel robot using Tank Drive joystick control
    """

    def __init__(self, physics_controller: PhysicsInterface, robot: "MyRobot"):
        """
        :param physics_controller: `pyfrc.physics.core.Physics` object
                                   to communicate simulation effects to
        :param robot: your robot object
        """

        self.physics_controller = physics_controller

        # The arm gearbox represents a gearbox containing two Vex 775pro motors.
        self.armGearbox = wpimath.system.plant.DCMotor.vex775Pro(2)

        # Simulation classes help us simulate what's going on, including gravity.
        # This arm sim represents an arm that can travel from -75 degrees (rotated down front)
        # to 255 degrees (rotated down in the back).
        self.armSim = wpilib.simulation.SingleJointedArmSim(
            self.armGearbox,
            Constants.kArmReduction,
            wpilib.simulation.SingleJointedArmSim.estimateMOI(
                Constants.kArmLength, Constants.kArmMass
            ),
            Constants.kArmLength,
            Constants.kMinAngleRads,
            Constants.kMaxAngleRads,
            True,
            # Add noise with a std-dev of 1 tick
            Constants.kArmEncoderDistPerPulse,
        )
        self.encoderSim = wpilib.simulation.EncoderSim(robot.arm.encoder)
        self.motorSim = wpilib.simulation.PWMSim(robot.arm.motor.getChannel())

        # Create a Mechanism2d display of an Arm with a fixed ArmTower and moving Arm.
        self.mech2d = wpilib.Mechanism2d(60, 60)
        self.armPivot = self.mech2d.getRoot("ArmPivot", 30, 30)
        self.armTower = self.armPivot.appendLigament("Arm Tower", 30, -90)
        self.arm = self.armPivot.appendLigament(
            "Arm",
            30,
            math.degrees(self.armSim.getAngle()),
            6,
            wpilib.Color8Bit(wpilib.Color.kYellow),
        )

        # Put Mechanism to SmartDashboard
        wpilib.SmartDashboard.putData("Arm Sim", self.mech2d)
        self.armTower.setColor(wpilib.Color8Bit(wpilib.Color.kBlue))

    def update_sim(self, now: float, tm_diff: float) -> None:
        """
        Called when the simulation parameters for the program need to be
        updated.

        :param now: The current time as a float
        :param tm_diff: The amount of time that has passed since the last
                        time that this function was called
        """

        # First, we set our "inputs" (voltages)
        self.armSim.setInput(
            0, self.motorSim.getSpeed() * wpilib.RobotController.getInputVoltage()
        )

        # Next, we update it
        self.armSim.update(tm_diff)

        # Finally, we set our simulated encoder's readings and simulated battery
        # voltage
        self.encoderSim.setDistance(self.armSim.getAngle())
        # SimBattery estimates loaded battery voltage
        wpilib.simulation.RoboRioSim.setVInVoltage(
            wpilib.simulation.BatterySim.calculate([self.armSim.getCurrentDraw()])
        )

        # Update the mechanism arm angle based on the simulated arm angle
        # -> setAngle takes degrees, getAngle returns radians... >_>
        self.arm.setAngle(math.degrees(self.armSim.getAngle()))
