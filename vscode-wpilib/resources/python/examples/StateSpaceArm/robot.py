#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import math
import wpilib
import wpimath
import wpimath.units
import wpimath.system.plant

kMotorPort = 0
kEncoderAChannel = 0
kEncoderBChannel = 1
kJoystickPort = 0
kRaisedPosition = wpimath.units.feetToMeters(90.0)
kLoweredPosition = wpimath.units.feetToMeters(0.0)

# Moment of inertia of the arm, in kg * m^2. Can be estimated with CAD. If finding this constant
# is difficult, LinearSystem.identifyPositionSystem may be better.
kArmMOI = 1.2

# Reduction between motors and encoder, as output over input. If the arm spins slower than
# the motors, this number should be greater than one.
kArmGearing = 10.0


class MyRobot(wpilib.TimedRobot):
    """This is a sample program to demonstrate how to use a state-space controller to control an arm."""

    def robotInit(self) -> None:
        self.profile = wpimath.TrapezoidProfile(
            wpimath.TrapezoidProfile.Constraints(
                wpimath.units.feetToMeters(45),
                wpimath.units.feetToMeters(90),  # Max elevator speed and acceleration.
            )
        )

        self.lastProfiledReference = wpimath.TrapezoidProfile.State()

        # The plant holds a state-space model of our elevator. This system has the following properties:

        # States: [position, velocity], in meters and meters per second.
        # Inputs (what we can "put in"): [voltage], in volts.
        # Outputs (what we can measure): [position], in meters.
        self.armPlant = wpimath.system.plant.LinearSystemId.singleJointedArmSystem(
            wpimath.system.plant.DCMotor.NEO(2),
            kArmMOI,
            kArmGearing,
        )

        # The observer fuses our encoder data and voltage inputs to reject noise.
        self.observer = wpimath.KalmanFilter_2_1_1(
            self.armPlant,
            (
                0.015,
                0.17,
            ),  # How accurate we think our model is, in radians and radians/sec.
            (
                0.01,
            ),  # How accurate we think our encoder position data is. In this case we very highly trust our encoder position reading.
            0.020,
        )

        # A LQR uses feedback to create voltage commands.
        self.controller = wpimath.LinearQuadraticRegulator_2_1(
            self.armPlant,
            [
                wpimath.units.degreesToRadians(1.0),
                wpimath.units.degreesToRadians(10.0),
            ],  # qelms.
            # Position and velocity error tolerances, in radians and radians per second. Decrease
            # this
            # to more heavily penalize state excursion, or make the controller behave more
            # aggressively. In this example we weight position much more highly than velocity, but
            # this
            # can be tuned to balance the two.
            [12.0],  # relms. Control effort (voltage) tolerance. Decrease this to more
            # heavily penalize control effort, or make the controller less aggressive. 12 is a good
            # starting point because that is the (approximate) maximum voltage of a battery.
            0.020,  # Nominal time between loops. 0.020 for TimedRobot, but can be
            # lower if using notifiers.
        )

        # The state-space loop combines a controller, observer, feedforward and plant for easy control.
        self.loop = wpimath.LinearSystemLoop_2_1_1(
            self.armPlant, self.controller, self.observer, 12.0, 0.020
        )

        # An encoder set up to measure flywheel velocity in radians per second.
        self.encoder = wpilib.Encoder(kEncoderAChannel, kEncoderBChannel)

        self.motor = wpilib.PWMSparkMax(kMotorPort)

        # A joystick to read the trigger from.
        self.joystick = wpilib.Joystick(kJoystickPort)

        # We go 2 pi radians in 1 rotation, or 4096 counts.
        self.encoder.setDistancePerPulse(math.tau / 4096)

    def teleopInit(self) -> None:
        # Reset our loop to make sure it's in a known state.
        self.loop.reset([self.encoder.getDistance(), self.encoder.getRate()])

        # Reset our last reference to the current state.
        self.lastProfiledReference = wpimath.TrapezoidProfile.State(
            self.encoder.getDistance(), self.encoder.getRate()
        )

    def teleopPeriodic(self) -> None:
        # Sets the target position of our arm. This is similar to setting the setpoint of a
        # PID controller.

        goal = wpimath.TrapezoidProfile.State()

        if self.joystick.getTrigger():
            # the trigger is pressed, so we go to the high goal.
            goal = wpimath.TrapezoidProfile.State(kRaisedPosition, 0.0)

        else:
            # Otherwise, we go to the low goal
            goal = wpimath.TrapezoidProfile.State(kLoweredPosition, 0.0)

        # Step our TrapezoidalProfile forward 20ms and set it as our next reference
        self.lastProfiledReference = self.profile.calculate(
            0.020, self.lastProfiledReference, goal
        )
        self.loop.setNextR(
            [self.lastProfiledReference.position, self.lastProfiledReference.velocity]
        )

        # Correct our Kalman filter's state vector estimate with encoder data.
        self.loop.correct([self.encoder.getDistance()])

        # Update our LQR to generate new voltage commands and use the voltages to predict the next
        # state with out Kalman filter.
        self.loop.predict(0.020)

        # Send the new calculated voltage to the motors.
        # voltage = duty cycle * battery voltage, so
        # duty cycle = voltage / battery voltage
        nextVoltage = self.loop.U(0)
        self.motor.setVoltage(nextVoltage)
