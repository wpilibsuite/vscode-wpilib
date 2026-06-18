#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib.interfaces
import enum


class ExampleSmartMotorController(wpilib.interfaces.MotorController):
    """A simplified stub class that simulates the API of a common "smart" motor controller.
    Has no actual functionality.
    """

    class PIDMode(enum.Enum):
        kPosition = enum.auto()
        kVelocity = enum.auto()
        kMovementWitchcraft = enum.auto()

    def __init__(self, port: int) -> None:
        """Creates a new ExampleSmartMotorController.

        Args:
            port: The port for the controller.
        """
        super().__init__()

    def setPID(self, kp: float, ki: float, kd: float) -> None:
        """Example method for setting the PID gains of the smart controller.

        Args:
            kp: The proportional gain.
            ki: The integral gain.
            kd: The derivative gain.
        """
        pass

    def setSetPoint(
        self, mode: PIDMode, setpoint: float, arbfeedforward: float
    ) -> None:
        """Example method for setting the setpoint of the smart controller in PID mode.

        Args:
            mode: The mode of the PID controller.
            setpoint: The controller setpoint.
            arbfeedforward: An arbitrary feedforward output (from -1 to 1).
        """
        pass

    def follow(self, leader: "ExampleSmartMotorController") -> None:
        """Places this motor controller in follower mode.

        Args:
            leader: The leader to follow.
        """
        pass

    def getEncoderDistance(self) -> float:
        """Returns the encoder distance.

        Returns:
            The current encoder distance.
        """
        return 0

    def getEncoderRate(self) -> float:
        """Returns the encoder rate.

        Returns:
            The current encoder rate.
        """
        return 0

    def resetEncoder(self) -> None:
        """Resets the encoder to zero distance."""
        pass

    def set(self, speed: float) -> None:
        pass

    def get(self) -> float:
        pass

    def setInverted(self, isInverted: bool) -> None:
        pass

    def getInverted(self) -> bool:
        pass

    def disable(self) -> None:
        pass

    def stopMotor(self) -> None:
        pass
