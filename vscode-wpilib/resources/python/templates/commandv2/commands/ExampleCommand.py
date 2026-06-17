# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.

import wpilib
import commands2
from subsystems import ExampleSubsystem

class ExampleCommand(commands2.Command):
  # Creates a new ReplaceMeCommand
  def __init__(self, subsystem: ExampleSubsystem):
      super().__init__()
      self.subsystem = subsystem;
      #Use addRequirements() here to declare subsystem dependencies.
      self.addRequirements(subsystem)
  # Called when the command is initially scheduled.
  def initialize(self) -> None:
        
  # Called every time the scheduler runs while the command is scheduled.
  def execute(self) -> None:
        
  # Called once the command ends or is interrupted
  def end(self, interrupted) -> None:
        
  # Returns true when the command should end
  def isFinished(self) -> bool:
    return False