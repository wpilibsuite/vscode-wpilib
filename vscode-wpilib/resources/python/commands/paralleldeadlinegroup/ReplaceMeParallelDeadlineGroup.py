# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import wpilib
import commands2
from commands2 import InstantCommand

class ReplaceMeParallelDeadlineGroup(commands2.ParallelDeadlineGroup):
    # Creates a new ReplaceMeParallelDeadlineGroup
    def __init__(self):
        super.__init__()
        # Add the deadline command in the super() call, add other commands using addCommands().
        super(InstantCommand())
        self.addCommands()