#!/usr/bin/env python3
#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

import wpilib
from wpilib.shuffleboard import Shuffleboard


class MyRobot(wpilib.TimedRobot):
    """
    This is a sample program showing the use of the solenoid classes during operator control. Three
    buttons from a joystick will be used to control two solenoids: One button to control the position
    of a single solenoid and the other two buttons to control a double solenoid. Single solenoids can
    either be on or off, such that the air diverted through them goes through either one channel or
    the other. Double solenoids have three states: Off, Forward, and Reverse. Forward and Reverse
    divert the air through the two channels and correspond to the on and off of a single solenoid,
    but a double solenoid can also be "off", where the solenoid will remain in its default power off
    state. Additionally, double solenoids take up two channels on your PCM whereas single solenoids
    only take a single channel.
    """

    def robotInit(self):
        self.joystick = wpilib.Joystick(0)

        # Solenoid corresponds to a single solenoid.
        # In this case, it's connected to channel 0 of a PH with the default CAN ID.
        self.solenoid = wpilib.Solenoid(
            moduleType=wpilib.PneumaticsModuleType.REVPH, channel=0
        )

        # DoubleSolenoid corresponds to a double solenoid.
        # In this case, it's connected to channels 1 and 2 of a PH with the default CAN ID.
        self.doubleSolenoid = wpilib.DoubleSolenoid(
            moduleType=wpilib.PneumaticsModuleType.REVPH,
            forwardChannel=1,
            reverseChannel=2,
        )

        # Compressor connected to a PH with a default CAN ID (1)
        self.compressor = wpilib.Compressor(wpilib.PneumaticsModuleType.REVPH)

        self.kSolenoidButton = 1
        self.kDoubleSolenoidForwardButton = 2
        self.kDoubleSolenoidReverseButton = 3
        self.kCompressorButton = 4

        #
        # Publish elements to shuffleboard
        #

        tab = Shuffleboard.getTab("Pneumatics")
        tab.add("Single Solenoid", self.solenoid)
        tab.add("Double Solenoid", self.doubleSolenoid)
        tab.add("Compressor", self.compressor)

        # Also publish some raw data
        tab.addDouble("PH Pressure [PSI]", lambda: self.compressor.getCurrent())
        tab.addDouble("Compressor Current [A]", lambda: self.compressor.getCurrent())
        tab.addBoolean("Compressor Active", lambda: self.compressor.isEnabled())
        tab.addBoolean(
            "Pressure Switch", lambda: self.compressor.getPressureSwitchValue()
        )

    def teleopPeriodic(self):
        # The output of GetRawButton is true/false depending on whether
        # the button is pressed; Set takes a boolean for whether
        # to retract the solenoid (false) or extend it (true).
        self.solenoid.set(self.joystick.getRawButton(self.kSolenoidButton))

        # GetRawButtonPressed will only return true once per press.
        # If a button is pressed, set the solenoid to the respective channel.

        if self.joystick.getRawButtonPressed(self.kDoubleSolenoidForwardButton):
            self.doubleSolenoid.set(wpilib.DoubleSolenoid.Value.kForward)
        elif self.joystick.getRawButtonPressed(self.kDoubleSolenoidReverseButton):
            self.doubleSolenoid.set(wpilib.DoubleSolenoid.Value.kReverse)

        # On button press, toggle the compressor.
        if self.joystick.getRawButtonPressed(self.kCompressorButton):
            # Check whether the compressor is currently enabled.
            isCompressorEnabled = self.compressor.isEnabled()
            if isCompressorEnabled:
                # Disable closed-loop mode on the compressor
                self.compressor.disable()
            else:
                # Change the if states to select the closed-loop you want to use:

                if False:
                    # Enable the closed-lopp mode base on the digital pressure switch connect to the PCM/PH.
                    # The switch is open when the pressure is over ~120 PSI.
                    self.compressor.enableDigital()

                if True:
                    # Enable closed-loop mode based on the analog pressure sensor connected to the PH.
                    # The compressor will run while the pressure reported by the sensor is in the
                    # specified range ([70 PSI, 120 PSI] in this example).
                    # Analog mode exists only on the PH! On the PCM, this enables digital control.
                    self.compressor.enableAnalog(70, 120)

                if False:
                    # Enable closed-loop mode based on both the digital pressure switch AND the analog
                    # pressure sensor connected to the PH.
                    # The compressor will run while the pressure reported by the analog sensor is in the
                    # specified range ([70 PSI, 120 PSI] in this example) AND the digital switch reports
                    # that the system is not full.
                    # Hybrid mode exists only on the PH! On the PCM, this enables digital control.
                    self.compressor.enableHybrid(70, 120)
