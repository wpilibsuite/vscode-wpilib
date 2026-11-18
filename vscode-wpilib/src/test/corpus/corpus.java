// generated corpus for Java replacement idempotence. Do not modify file directly. Generate using "npm run generate-replacement-corpus"
import edu.wpi.first.util.ClassPreloader;

import edu.wpi.first.util.CombinedRuntimeLoader;

import edu.wpi.first.util.MsvcRuntimeException;

import edu.wpi.first.util.RuntimeDetector;

import edu.wpi.first.util.RuntimeLoader;

import edu.wpi.first.util.DoubleCircularBuffer;

import edu.wpi.first.util.CircularBuffer;

import edu.wpi.first.util.WPICleaner;

import edu.wpi.first.util.EventVector;

import edu.wpi.first.wpilibj2.commands.DevMain;

import edu.wpi.first.wpilibj2.MockHardwareExtension;

import edu.wpi.first.math.DARE;

import edu.wpi.first.math.VecBuilder;

import edu.wpi.first.math.Vector;

import edu.wpi.first.math.Matrix;

import edu.wpi.first.math.MatBuilder;

import edu.wpi.first.math.proto.VectorProto;

import edu.wpi.first.math.proto.MatrixProto;

import edu.wpi.first.math.struct.VectorStruct;

import edu.wpi.first.math.struct.MatrixStruct;

import edu.wpi.first.math.MathUtil;

import edu.wpi.first.math.StateSpaceUtil;

import edu.wpi.first.math.ComputerVisionUtil;

import edu.wpi.first.math.MathShared;

import edu.wpi.first.math.MathSharedStore;

import edu.wpi.first.math.Pair;

import edu.wpi.first.math.Num;

import edu.wpi.first.math.Nat;

import edu.wpi.first.math.InterpolatingMatrixTreeMap;

import edu.wpi.first.math.system.plant.LinearSystemId;

import edu.wpi.first.math.system.plant;

import edu.wpi.first.wpilibj.ProtoTestBase;

import edu.wpi.first.wpilibj.StructTestBase;

import edu.wpi.first.wpilibj.UtilityClassTest;

import edu.wpi.first.wpilibj.DriverStation;

import edu.wpi.first.wpilibj.GenericHID;

import edu.wpi.first.wpilibj.Joystick;

import edu.wpi.first.wpilibj.Gamepad;

import edu.wpi.first.wpilibj.PS4Controller;

import edu.wpi.first.wpilibj.PS5Controller;

import edu.wpi.first.wpilibj.StadiaController;

import edu.wpi.first.wpilibj.XboxController;

import edu.wpi.first.wpilibj.DSControlWord;

import edu.wpi.first.wpilibj.CAN;

import edu.wpi.first.wpilibj.I2C;

import edu.wpi.first.wpilibj.SerialPort;

import edu.wpi.first.wpilibj.ADXL345_I2C;

import edu.wpi.first.wpilibj.AnalogAccelerometer;

import edu.wpi.first.wpilibj.AnalogInput;

import edu.wpi.first.wpilibj.CounterBase;

import edu.wpi.first.wpilibj.DigitalInput;

import edu.wpi.first.wpilibj.DigitalOutput;

import edu.wpi.first.wpilibj.PWM;

import edu.wpi.first.wpilibj.OnboardIMU;

import edu.wpi.first.wpilibj.AddressableLED;

import edu.wpi.first.wpilibj.AddressableLEDBuffer;

import edu.wpi.first.wpilibj.AddressableLEDBufferView;

import edu.wpi.first.wpilibj.LEDPattern;

import edu.wpi.first.wpilibj.LEDReader;

import edu.wpi.first.wpilibj.LEDWriter;

import edu.wpi.first.wpilibj.motorcontrol.MotorController;

import edu.wpi.first.wpilibj.motorcontrol.MotorControllerGroup;

import edu.wpi.first.wpilibj.MotorSafety;

import edu.wpi.first.wpilibj.motorcontrol.PWMMotorController;

import edu.wpi.first.wpilibj.MotorSafety;

import edu.wpi.first.wpilibj.motorcontrol.DMC60;

import edu.wpi.first.wpilibj.motorcontrol.Jaguar;

import edu.wpi.first.wpilibj.motorcontrol.Koors40;

import edu.wpi.first.wpilibj.motorcontrol.PWMSparkFlex;

import edu.wpi.first.wpilibj.motorcontrol.PWMSparkMax;

import edu.wpi.first.wpilibj.motorcontrol.PWMTalonFX;

import edu.wpi.first.wpilibj.motorcontrol.PWMTalonSRX;

import edu.wpi.first.wpilibj.motorcontrol.PWMVenom;

import edu.wpi.first.wpilibj.motorcontrol.PWMVictorSPX;

import edu.wpi.first.wpilibj.motorcontrol.SD540;

import edu.wpi.first.wpilibj.motorcontrol.Spark;

import edu.wpi.first.wpilibj.motorcontrol.SparkMini;

import edu.wpi.first.wpilibj.motorcontrol.Talon;

import edu.wpi.first.wpilibj.motorcontrol.Victor;

import edu.wpi.first.wpilibj.motorcontrol.VictorSP;

import edu.wpi.first.wpilibj.motorcontrol.MockPWMMotorController;

import edu.wpi.first.wpilibj.motorcontrol.MockMotorController;

import edu.wpi.first.wpilibj.Compressor;

import edu.wpi.first.wpilibj.CompressorConfigType;

import edu.wpi.first.wpilibj.DoubleSolenoid;

import edu.wpi.first.wpilibj.PneumaticHub;

import edu.wpi.first.wpilibj.PneumaticsBase;

import edu.wpi.first.wpilibj.PneumaticsControlModule;

import edu.wpi.first.wpilibj.PneumaticsModuleType;

import edu.wpi.first.wpilibj.Solenoid;

import edu.wpi.first.wpilibj.DoubleSolenoidTestCTRE;

import edu.wpi.first.wpilibj.DoubleSolenoidTestREV;

import edu.wpi.first.wpilibj.SolenoidTestCTRE;

import edu.wpi.first.wpilibj.SolenoidTestREV;

import edu.wpi.first.wpilibj.PowerDistribution;

import edu.wpi.first.wpilibj.SharpIR;

import edu.wpi.first.wpilibj.AnalogEncoder;

import edu.wpi.first.wpilibj.AnalogPotentiometer;

import edu.wpi.first.wpilibj.DutyCycle;

import edu.wpi.first.wpilibj.DutyCycleEncoder;

import edu.wpi.first.wpilibj.Encoder;

import edu.wpi.first.wpilibj.Servo;

import edu.wpi.first.wpilibj.IterativeRobotBase;

import edu.wpi.first.wpilibj.RobotBase;

import edu.wpi.first.wpilibj.RobotState;

import edu.wpi.first.wpilibj.TimedRobot;

import edu.wpi.first.wpilibj.TimesliceRobot;

import edu.wpi.first.wpilibj.DataLogManager;

import edu.wpi.first.wpilibj.Filesystem;

import edu.wpi.first.wpilibj.Notifier;

import edu.wpi.first.wpilibj.Resource;

import edu.wpi.first.wpilibj.RobotController;

import edu.wpi.first.wpilibj.RuntimeType;

import edu.wpi.first.wpilibj.SensorUtil;

import edu.wpi.first.wpilibj.SystemServer;

import edu.wpi.first.wpilibj.Threads;

import edu.wpi.first.wpilibj.Timer;

import edu.wpi.first.wpilibj.Tracer;

import edu.wpi.first.wpilibj.Watchdog;

import edu.wpi.first.wpilibj.AlertType;

import edu.wpi.first.wpilibj.Alert;

import org.wpilib.driverstation.Alert.AlertType;

import edu.wpi.first.wpilibj.Preferences;

import edu.wpi.first.util;

import edu.wpi.first.math;

import edu.wpi.first.net;

import edu.wpi.first.datalog;

import edu.wpi.first.wpilibj2.command;

import org.wpilib.commands3;

import edu.wpi.first.networktables;

import edu.wpi.first.fields;

#include "edu.wpi.first.hal"

import edu.wpi.first.units;

import edu.wpi.first.apriltag;

import edu.wpi.first.epilogue.processor;

import edu.wpi.first.epilogue;

import edu.wpi.first.epilogue.logging;

import edu.wpi.first.cscore;

import edu.wpi.first.vision;

import edu.wpi.first.cameraserver;

import edu.wpi.first.wpilibj.xrp;

import edu.wpi.first.wpilibj.romi;

import edu.wpi.first.wpilibj.commands;

import edu.wpi.first.wpilibj.examples;

import edu.wpi.first.wpilibj.snippets;

import edu.wpi.first.wpilibj.templates;

import edu.wpi.first.wpilibj;

// context
GradientType.kContinuous;
Object y = GradientType.kContinuous;

// context
GradientType.kDiscrete;
Object y = GradientType.kDiscrete;

// context
CTREPCM;
Object y = CTREPCM;

// context
REVPH;
Object y = REVPH;

// context
DoubleSolenoid.Value.kOff;
Object y = DoubleSolenoid.Value.kOff;

// context
DoubleSolenoid.Value.kForward;
Object y = DoubleSolenoid.Value.kForward;

// context
DoubleSolenoid.Value.kReverse;
Object y = DoubleSolenoid.Value.kReverse;

// context
ColorOrder.kRGB;
Object y = ColorOrder.kRGB;

// context
ColorOrder.kBGR;
Object y = ColorOrder.kBGR;

// context
ColorOrder.kGRB;
Object y = ColorOrder.kGRB;

// context
ColorOrder.kBRG;
Object y = ColorOrder.kBRG;

// context
ColorOrder.kRBG;
Object y = ColorOrder.kRBG;

// context
ColorOrder.kGBR;
Object y = ColorOrder.kGBR;

// context
MountOrientation.kFlat;
Object y = MountOrientation.kFlat;

// context
MountOrientation.kLandscape;
Object y = MountOrientation.kLandscape;

// context
MountOrientation.kPortrait;
Object y = MountOrientation.kPortrait;

// context
DriverStation.Alliance;
Object y = DriverStation.Alliance;

// context
DriverStation.MatchType;
Object y = DriverStation.MatchType;

// context
MatchState.getAlliance();
Object x = MatchState.getAlliance();

// context
MatchState.getMatchType();
Object x = MatchState.getMatchType();

// context
MatchState.getMatchNumber();
Object x = MatchState.getMatchNumber();

// context
MatchState.getEventName();
Object x = MatchState.getEventName();

// context
MatchState.getReplayNumber();
Object x = MatchState.getReplayNumber();

// context
MatchState.getLocation();
Object x = MatchState.getLocation();

// context
MatchState.getMatchTime();
Object x = MatchState.getMatchTime();

// context
MatchState.getGameData();
Object x = MatchState.getGameData();

// context
Alliance.Red;
Object y = Alliance.Red;

// context
Alliance.Blue;
Object y = Alliance.Blue;

// context
MatchType.None;
Object y = MatchType.None;

// context
MatchType.Practice;
Object y = MatchType.Practice;

// context
MatchType.Qualification;
Object y = MatchType.Qualification;

// context
MatchType.Elimination;
Object y = MatchType.Elimination;

// context
RobotState.isEnabled();
Object x = RobotState.isEnabled();

// context
RobotState.isDisabled();
Object x = RobotState.isDisabled();

// context
RobotState.isAutonomous();
Object x = RobotState.isAutonomous();

// context
RobotState.isTeleop();
Object x = RobotState.isTeleop();

// context
RobotState.isUtility();
Object x = RobotState.isUtility();

// context
RobotState.isAutonomousEnabled();
Object x = RobotState.isAutonomousEnabled();

// context
RobotState.isTeleopEnabled();
Object x = RobotState.isTeleopEnabled();

// context
RobotState.isUtilityEnabled();
Object x = RobotState.isUtilityEnabled();

// context
RobotState.isFMSAttached();
Object x = RobotState.isFMSAttached();

// context
RobotState.isDSAttached();
Object x = RobotState.isDSAttached();

// context
utilityInit();
Object x = utilityInit();

// context
utilityPeriodic();
Object x = utilityPeriodic();

// context
utilityExit();
Object x = utilityExit();

#include "org.wpilib.hardware.motor."

import org.wpilib.math.kinematics.ChassisSpeeds;

// context
ChassisSpeeds;
Object y = ChassisSpeeds;

// context
DriverStation.reportError;
Object y = DriverStation.reportError;

// context
DriverStation.reportWarning;
Object y = DriverStation.reportWarning;

// context
.vxMetersPerSecond;
Object y = .vxMetersPerSecond;

// context
.vyMetersPerSecond;
Object y = .vyMetersPerSecond;

// context
.omegaRadiansPerSecond;
Object y = .omegaRadiansPerSecond;

// context
.speedMetersPerSecond;
Object y = .speedMetersPerSecond;

// context
getVelocity();
Object x = getVelocity();

// context
getAngularPosition();
Object x = getAngularPosition();

// context
scrollAtRelativeVelocity(;
Object x = scrollAtRelativeVelocity(;

// context
scrollAtAbsoluteVelocity(;
Object x = scrollAtAbsoluteVelocity(;

// context
AlertType.kError;
Object y = AlertType.kError;

// context
AlertType.kWarning;
Object y = AlertType.kWarning;

// context
AlertType.kInfo;
Object y = AlertType.kInfo;

// context
Color.kDenim;
Object y = Color.kDenim;

// context
Color.kFirstBlue;
Object y = Color.kFirstBlue;

// context
Color.kFirstRed;
Object y = Color.kFirstRed;

// context
Color.kAliceBlue;
Object y = Color.kAliceBlue;

// context
Color.kAntiqueWhite;
Object y = Color.kAntiqueWhite;

// context
Color.kAqua;
Object y = Color.kAqua;

// context
Color.kAquamarine;
Object y = Color.kAquamarine;

// context
Color.kAzure;
Object y = Color.kAzure;

// context
Color.kBeige;
Object y = Color.kBeige;

// context
Color.kBisque;
Object y = Color.kBisque;

// context
Color.kBlack;
Object y = Color.kBlack;

// context
Color.kBlanchedAlmond;
Object y = Color.kBlanchedAlmond;

// context
Color.kBlue;
Object y = Color.kBlue;

// context
Color.kBlueViolet;
Object y = Color.kBlueViolet;

// context
Color.kBrown;
Object y = Color.kBrown;

// context
Color.kBurlywood;
Object y = Color.kBurlywood;

// context
Color.kCadetBlue;
Object y = Color.kCadetBlue;

// context
Color.kChartreuse;
Object y = Color.kChartreuse;

// context
Color.kChocolate;
Object y = Color.kChocolate;

// context
Color.kCoral;
Object y = Color.kCoral;

// context
Color.kCornflowerBlue;
Object y = Color.kCornflowerBlue;

// context
Color.kCornsilk;
Object y = Color.kCornsilk;

// context
Color.kCrimson;
Object y = Color.kCrimson;

// context
Color.kCyan;
Object y = Color.kCyan;

// context
Color.kDarkBlue;
Object y = Color.kDarkBlue;

// context
Color.kDarkCyan;
Object y = Color.kDarkCyan;

// context
Color.kDarkGoldenrod;
Object y = Color.kDarkGoldenrod;

// context
Color.kDarkGray;
Object y = Color.kDarkGray;

// context
Color.kDarkGreen;
Object y = Color.kDarkGreen;

// context
Color.kDarkKhaki;
Object y = Color.kDarkKhaki;

// context
Color.kDarkMagenta;
Object y = Color.kDarkMagenta;

// context
Color.kDarkOliveGreen;
Object y = Color.kDarkOliveGreen;

// context
Color.kDarkOrange;
Object y = Color.kDarkOrange;

// context
Color.kDarkOrchid;
Object y = Color.kDarkOrchid;

// context
Color.kDarkRed;
Object y = Color.kDarkRed;

// context
Color.kDarkSalmon;
Object y = Color.kDarkSalmon;

// context
Color.kDarkSeaGreen;
Object y = Color.kDarkSeaGreen;

// context
Color.kDarkSlateBlue;
Object y = Color.kDarkSlateBlue;

// context
Color.kDarkSlateGray;
Object y = Color.kDarkSlateGray;

// context
Color.kDarkTurquoise;
Object y = Color.kDarkTurquoise;

// context
Color.kDarkViolet;
Object y = Color.kDarkViolet;

// context
Color.kDeepPink;
Object y = Color.kDeepPink;

// context
Color.kDeepSkyBlue;
Object y = Color.kDeepSkyBlue;

// context
Color.kDimGray;
Object y = Color.kDimGray;

// context
Color.kDodgerBlue;
Object y = Color.kDodgerBlue;

// context
Color.kFirebrick;
Object y = Color.kFirebrick;

// context
Color.kFloralWhite;
Object y = Color.kFloralWhite;

// context
Color.kForestGreen;
Object y = Color.kForestGreen;

// context
Color.kFuchsia;
Object y = Color.kFuchsia;

// context
Color.kGainsboro;
Object y = Color.kGainsboro;

// context
Color.kGhostWhite;
Object y = Color.kGhostWhite;

// context
Color.kGold;
Object y = Color.kGold;

// context
Color.kGoldenrod;
Object y = Color.kGoldenrod;

// context
Color.kGray;
Object y = Color.kGray;

// context
Color.kGreen;
Object y = Color.kGreen;

// context
Color.kGreenYellow;
Object y = Color.kGreenYellow;

// context
Color.kHoneydew;
Object y = Color.kHoneydew;

// context
Color.kHotPink;
Object y = Color.kHotPink;

// context
Color.kIndianRed;
Object y = Color.kIndianRed;

// context
Color.kIndigo;
Object y = Color.kIndigo;

// context
Color.kIvory;
Object y = Color.kIvory;

// context
Color.kKhaki;
Object y = Color.kKhaki;

// context
Color.kLavender;
Object y = Color.kLavender;

// context
Color.kLavenderBlush;
Object y = Color.kLavenderBlush;

// context
Color.kLawnGreen;
Object y = Color.kLawnGreen;

// context
Color.kLemonChiffon;
Object y = Color.kLemonChiffon;

// context
Color.kLightBlue;
Object y = Color.kLightBlue;

// context
Color.kLightCoral;
Object y = Color.kLightCoral;

// context
Color.kLightCyan;
Object y = Color.kLightCyan;

// context
Color.kLightGoldenrodYellow;
Object y = Color.kLightGoldenrodYellow;

// context
Color.kLightGray;
Object y = Color.kLightGray;

// context
Color.kLightGreen;
Object y = Color.kLightGreen;

// context
Color.kLightPink;
Object y = Color.kLightPink;

// context
Color.kLightSalmon;
Object y = Color.kLightSalmon;

// context
Color.kLightSeaGreen;
Object y = Color.kLightSeaGreen;

// context
Color.kLightSkyBlue;
Object y = Color.kLightSkyBlue;

// context
Color.kLightSlateGray;
Object y = Color.kLightSlateGray;

// context
Color.kLightSteelBlue;
Object y = Color.kLightSteelBlue;

// context
Color.kLightYellow;
Object y = Color.kLightYellow;

// context
Color.kLime;
Object y = Color.kLime;

// context
Color.kLimeGreen;
Object y = Color.kLimeGreen;

// context
Color.kLinen;
Object y = Color.kLinen;

// context
Color.kMagenta;
Object y = Color.kMagenta;

// context
Color.kMaroon;
Object y = Color.kMaroon;

// context
Color.kMediumAquamarine;
Object y = Color.kMediumAquamarine;

// context
Color.kMediumBlue;
Object y = Color.kMediumBlue;

// context
Color.kMediumOrchid;
Object y = Color.kMediumOrchid;

// context
Color.kMediumPurple;
Object y = Color.kMediumPurple;

// context
Color.kMediumSeaGreen;
Object y = Color.kMediumSeaGreen;

// context
Color.kMediumSlateBlue;
Object y = Color.kMediumSlateBlue;

// context
Color.kMediumSpringGreen;
Object y = Color.kMediumSpringGreen;

// context
Color.kMediumTurquoise;
Object y = Color.kMediumTurquoise;

// context
Color.kMediumVioletRed;
Object y = Color.kMediumVioletRed;

// context
Color.kMidnightBlue;
Object y = Color.kMidnightBlue;

// context
Color.kMintcream;
Object y = Color.kMintcream;

// context
Color.kMistyRose;
Object y = Color.kMistyRose;

// context
Color.kMoccasin;
Object y = Color.kMoccasin;

// context
Color.kNavajoWhite;
Object y = Color.kNavajoWhite;

// context
Color.kNavy;
Object y = Color.kNavy;

// context
Color.kOldLace;
Object y = Color.kOldLace;

// context
Color.kOlive;
Object y = Color.kOlive;

// context
Color.kOliveDrab;
Object y = Color.kOliveDrab;

// context
Color.kOrange;
Object y = Color.kOrange;

// context
Color.kOrangeRed;
Object y = Color.kOrangeRed;

// context
Color.kOrchid;
Object y = Color.kOrchid;

// context
Color.kPaleGoldenrod;
Object y = Color.kPaleGoldenrod;

// context
Color.kPaleGreen;
Object y = Color.kPaleGreen;

// context
Color.kPaleTurquoise;
Object y = Color.kPaleTurquoise;

// context
Color.kPaleVioletRed;
Object y = Color.kPaleVioletRed;

// context
Color.kPapayaWhip;
Object y = Color.kPapayaWhip;

// context
Color.kPeachPuff;
Object y = Color.kPeachPuff;

// context
Color.kPeru;
Object y = Color.kPeru;

// context
Color.kPink;
Object y = Color.kPink;

// context
Color.kPlum;
Object y = Color.kPlum;

// context
Color.kPowderBlue;
Object y = Color.kPowderBlue;

// context
Color.kPurple;
Object y = Color.kPurple;

// context
Color.kRed;
Object y = Color.kRed;

// context
Color.kRosyBrown;
Object y = Color.kRosyBrown;

// context
Color.kRoyalBlue;
Object y = Color.kRoyalBlue;

// context
Color.kSaddleBrown;
Object y = Color.kSaddleBrown;

// context
Color.kSalmon;
Object y = Color.kSalmon;

// context
Color.kSandyBrown;
Object y = Color.kSandyBrown;

// context
Color.kSeaGreen;
Object y = Color.kSeaGreen;

// context
Color.kSeashell;
Object y = Color.kSeashell;

// context
Color.kSienna;
Object y = Color.kSienna;

// context
Color.kSilver;
Object y = Color.kSilver;

// context
Color.kSkyBlue;
Object y = Color.kSkyBlue;

// context
Color.kSlateBlue;
Object y = Color.kSlateBlue;

// context
Color.kSlateGray;
Object y = Color.kSlateGray;

// context
Color.kSnow;
Object y = Color.kSnow;

// context
Color.kSpringGreen;
Object y = Color.kSpringGreen;

// context
Color.kSteelBlue;
Object y = Color.kSteelBlue;

// context
Color.kTan;
Object y = Color.kTan;

// context
Color.kTeal;
Object y = Color.kTeal;

// context
Color.kThistle;
Object y = Color.kThistle;

// context
Color.kTomato;
Object y = Color.kTomato;

// context
Color.kTurquoise;
Object y = Color.kTurquoise;

// context
Color.kViolet;
Object y = Color.kViolet;

// context
Color.kWheat;
Object y = Color.kWheat;

// context
Color.kWhite;
Object y = Color.kWhite;

// context
Color.kWhiteSmoke;
Object y = Color.kWhiteSmoke;

// context
Color.kYellow;
Object y = Color.kYellow;

// context
Color.kYellowGreen;
Object y = Color.kYellowGreen;

// context
Math.clamp(;
Object x = Math.clamp(;

// context
Timer.getTimestamp();
Object x = Timer.getTimestamp();

import org.wpilib.driverstation.Alert;

import org.wpilib.driverstation.Alert.Level;

// context
SmartDashboard.putNumber;
Object y = SmartDashboard.putNumber;

// context
SmartDashboard.putString;
Object y = SmartDashboard.putString;

// context
SmartDashboard.putBoolean;
Object y = SmartDashboard.putBoolean;

import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;;

import org.wpilib.smartdashboard.SmartDashboard;;

import org.wpilib.math.util.Units;

// context
UnitConversions.metersToFeet(;
Object x = UnitConversions.metersToFeet(;

// context
UnitConversions.feetToMeters(;
Object x = UnitConversions.feetToMeters(;

// context
UnitConversions.metersToInches(;
Object x = UnitConversions.metersToInches(;

// context
UnitConversions.inchesToMeters(;
Object x = UnitConversions.inchesToMeters(;

// context
UnitConversions.degreesToRadians(;
Object x = UnitConversions.degreesToRadians(;

// context
UnitConversions.radiansToDegrees(;
Object x = UnitConversions.radiansToDegrees(;

// context
UnitConversions.radiansToRotations(;
Object x = UnitConversions.radiansToRotations(;

// context
UnitConversions.degreesToRotations(;
Object x = UnitConversions.degreesToRotations(;

// context
UnitConversions.rotationsToDegrees(;
Object x = UnitConversions.rotationsToDegrees(;

// context
UnitConversions.rotationsToRadians(;
Object x = UnitConversions.rotationsToRadians(;

// context
UnitConversions.rotationsPerMinuteToRadiansPerSecond(;
Object x = UnitConversions.rotationsPerMinuteToRadiansPerSecond(;

// context
UnitConversions.radiansPerSecondToRotationsPerMinute(;
Object x = UnitConversions.radiansPerSecondToRotationsPerMinute(;

// context
UnitConversions.milesPerHourToMetersPerSecond(;
Object x = UnitConversions.milesPerHourToMetersPerSecond(;

// context
UnitConversions.metersPerSecondToMilesPerHour(;
Object x = UnitConversions.metersPerSecondToMilesPerHour(;

// context
UnitConversions.millisecondsToSeconds(;
Object x = UnitConversions.millisecondsToSeconds(;

// context
UnitConversions.secondsToMilliseconds(;
Object x = UnitConversions.secondsToMilliseconds(;

// context
UnitConversions.kilogramsToLbs(;
Object x = UnitConversions.kilogramsToLbs(;

// context
UnitConversions.lbsToKilograms(;
Object x = UnitConversions.lbsToKilograms(;

// context
SysIdRoutine.Direction.kForward;
Object y = SysIdRoutine.Direction.kForward;

// context
SysIdRoutine.Direction.kReverse;
Object y = SysIdRoutine.Direction.kReverse;

import edu.wpi.first.wpilibj2.command.button.CommandPS4Controller;

import edu.wpi.first.wpilibj2.command.button.CommandPS5Controller;

// context
CommandPS4Controller;
Object y = CommandPS4Controller;

// context
CommandPS5Controller;
Object y = CommandPS5Controller;

// context
EncodingType.k4X;
Object y = EncodingType.k4X;

// context
EncodingType.k2X;
Object y = EncodingType.k2X;

// context
EncodingType.k1X;
Object y = EncodingType.k1X;

// context
LinearSystemId.createSingleJointedArmSystem;
Object y = LinearSystemId.createSingleJointedArmSystem;

// context
LinearSystemId.createFlywheelSystem;
Object y = LinearSystemId.createFlywheelSystem;

// context
LinearSystemId.createElevatorSystem;
Object y = LinearSystemId.createElevatorSystem;

// context
Models.singleJointedArmFromPhysicalConstants;
Object y = Models.singleJointedArmFromPhysicalConstants;

// context
Models.flywheelFromPhysicalConstants;
Object y = Models.flywheelFromPhysicalConstants;

// context
Models.elevatorFromPhysicalConstants;
Object y = Models.elevatorFromPhysicalConstants;

// context
Models.flywheelFromSysId;
Object y = Models.flywheelFromSysId;

// context
Models.singleJointedArmFromSysId;
Object y = Models.singleJointedArmFromSysId;

// context
Models.elevatorFromSysId;
Object y = Models.elevatorFromSysId;
