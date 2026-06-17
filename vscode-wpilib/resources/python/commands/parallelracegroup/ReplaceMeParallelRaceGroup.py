# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import wpilib
import commands2

class ReplaceMeParallelRaceGroup(commands2.ParallelRaceGroup):
    # Creates new ReplaceMeParallelRaceGroup
    # Given commands execute at the same time and exit when the first command finishes
    def __init__(self):
        super().__init__()
        # Add your commands in the addCommands() call
        self.addCommands()
