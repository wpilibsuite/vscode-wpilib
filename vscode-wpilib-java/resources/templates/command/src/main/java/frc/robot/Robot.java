package frc.robot;

import edu.wpi.first.wpilibj.IterativeRobot;

public class Robot extends TimedRobot {

    @Override
    public void robotInit() {
        System.out.println("Hello from robot init");
    }

    @Override
    public void disabledInit() { }

    @Override
    public void autonomousInit() { }

    @Override
    public void teleopInit() { }

    @Override
    public void testInit() { }


    @Override
    public void disabledPeriodic() {
        System.out.println("Hello from disabled periodic");
     }

    @Override
    public void autonomousPeriodic() { }

    @Override
    public void teleopPeriodic() {

     }

    @Override
    public void testPeriodic() { }
}
