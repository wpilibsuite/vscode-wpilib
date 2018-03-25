#include "Robot.h"

#include "IterativeRobot.h"

class Robot: public IterativeRobot {
public:
    Robot() { }

    void RobotInit() { }

    void DisabledInit() { }
    void AutonomousInit() { }
    void TeleopInit() { }
    void TestInit() { }

    void DisabledPeriodic() { }
    void AutonomousPeriodic() { }
    void TeleopPeriodic() { }
    void TestPeriodic() { }
};

START_ROBOT_CLASS(Robot)
