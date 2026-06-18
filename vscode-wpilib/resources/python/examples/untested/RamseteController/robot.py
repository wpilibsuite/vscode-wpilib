#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
import wpimath.controller
import wpimath.filter
import wpimath.geometry
import wpimath.trajectory
import wpimath.units

from drivetrain import Drivetrain


class MyRobot(wpilib.TimedRobot):
    def robotInit(self):
        self.controller = wpilib.XboxController(0)
        self.drive = Drivetrain()

        # Slew rate limiters to make joystick inputs more gentle; 1/3 sec from 0 to 1.
        self.speedLimiter = wpimath.filter.SlewRateLimiter(3)
        self.rotLimiter = wpimath.filter.SlewRateLimiter(3)

        # An example trajectory to follow during the autonomous period.
        self.trajectory = wpimath.trajectory.TrajectoryGenerator.generateTrajectory(
            wpimath.geometry.Pose2d(0, 0, wpimath.geometry.Rotation2d.fromDegrees(0)),
            [
                wpimath.geometry.Translation2d(1, 1),
                wpimath.geometry.Translation2d(2, -1),
            ],
            wpimath.geometry.Pose2d(3, 0, wpimath.geometry.Rotation2d.fromDegrees(0)),
            wpimath.trajectory.TrajectoryConfig(
                wpimath.units.feetToMeters(3.0), wpimath.units.feetToMeters(3.0)
            ),
        )

        # The Ramsete Controller to follow the trajectory.
        self.ramseteController = wpimath.controller.RamseteController()

        # The timer to use during the autonomous period.
        self.timer = wpilib.Timer()

        # Create Field2d for robot and trajectory visualizations.
        self.field = wpilib.Field2d()

        # Create and push Field2d to SmartDashboard.
        wpilib.SmartDashboard.putData(self.field)

        # Push the trajectory to Field2d.
        self.field.getObject("traj").setTrajectory(self.trajectory)

    def autonomousInit(self):
        # Initialize the timer.
        self.timer = wpilib.Timer()
        self.timer.start()

        # Reset the drivetrain's odometry to the starting pose of the trajectory.
        self.drive.resetOdometry(self.trajectory.initialPose())

    def autonomousPeriodic(self):
        # Update odometry.
        self.drive.updateOdometry()

        # Update robot position on Field2d.
        self.field.setRobotPose(self.drive.getPose())

        if self.timer.get() < self.trajectory.totalTime():
            # Get the desired pose from the trajectory.
            desiredPose = self.trajectory.sample(self.timer.get())

            # Get the reference chassis speeds from the Ramsete controller.
            refChassisSpeeds = self.ramseteController.calculate(
                self.drive.getPose(), desiredPose
            )

            # Set the linear and angular speeds.
            self.drive.drive(refChassisSpeeds.vx, refChassisSpeeds.omega)
        else:
            self.drive.drive(0, 0)

    def teleopPeriodic(self):
        # Get the x speed. We are inverting this because Xbox controllers return
        # negative values when we push forward.
        xSpeed = (
            -self.speedLimiter.calculate(self.controller.getLeftY())
            * Drivetrain.kMaxSpeed
        )

        # Get the rate of angular rotation. We are inverting this because we want a
        # positive value when we pull to the left (remember, CCW is positive in
        # mathematics). Xbox controllers return positive values when you pull to
        # the right by default.
        rot = (
            -self.rotLimiter.calculate(self.controller.getRightX())
            * Drivetrain.kMaxAngularSpeed
        )

        self.drive.drive(xSpeed, rot)
