// generated corpus for C++ replacement idempotence. Do not modify file directly. Generate using "npm run generate-replacement-corpus"
#include "ntcore_test.h"

#include "ntcore.h"

#include "ntcore_c.h"

#include "ntcore_cpp.h"

#include "hal/UsageReporting.h"

#include "fields/fields.h"

#include "frc/apriltag/AprilTagFieldLayout.h"

#include "frc/apriltag/AprilTagFields.h"

#include "wpi/apriltag/AprilTagFieldLayout.hpp"

#include "wpi/apriltag/AprilTagFields.hpp"

#include "ntcore_c_types.h"

#include "ntcore_cpp_types.h"

#include "wpimath/MathShared.h"

#include "frc/DARE.h"

#include "frc/ct_matrix.h"

#include "frc/EigenCore.h"

#include "frc/proto/MatrixProto.h"

#include "frc/proto/VectorProto.h"

#include "frc/struct/MatrixStruct.h"

#include "frc/struct/VectorStruct.h"

#include "frc/ComputerVisionUtil.h"

#include "frc/MathUtil.h"

#include "frc/StateSpaceUtil.h"

#include "cscore_cv.h"

#include "cscore_cpp.h"

#include "cscore.h"

#include "cscore_raw.h"

#include "cscore_c.h"

#include "cscore_oo.h"

#include "cscore_runloop.h"

#include "wpigui_openurl.h"

#include "portable-file-dialogs.h"

#include "wpigui_internal.h"

#include "wpigui.h"

#include "WPILibVersion.h"

#include "frc/DriverStation.h"

#include "frc/GenericHID.h"

#include "frc/Joystick.h"

#include "frc/Gamepad.h"

#include "frc/ADXL345_I2C.h"

#include "frc/DSControlWord.h"

#include "frc/AnalogAccelerometer.h"

#include "frc/CAN.h"

#include "frc/I2C.h"

#include "frc/SerialPort.h"

#include "frc/AnalogInput.h"

#include "frc/CounterBase.h"

#include "frc/DigitalInput.h"

#include "frc/DigitalOutput.h"

#include "frc/PWM.h"

#include "frc/Errors.h"

#include "frc/WPIErrors.mac"

#include "frc/WPIWarnings.mac"

#include "frc/OnboardIMU.h"

#include "frc/RuntimeType.h"

#include "frc/SensorUtil.h"

#include "frc/SharpIR.h"

#include "frc/SystemServer.h"

#include "frc/AddressableLED.h"

#include "frc/LEDPattern.h"

#include "frc/motorcontrol/MotorController.h"

#include "frc/motorcontrol/MotorControllerGroup.h"

#include "frc/MotorSafety.h"

#include "frc/motorcontrol/PWMMotorController.h"

#include "frc/Compressor.h"

#include "frc/CompressorConfigType.h"

#include "frc/DoubleSolenoid.h"

#include "frc/PneumaticHub.h"

#include "frc/PneumaticsBase.h"

#include "frc/PneumaticsControlModule.h"

#include "frc/PneumaticsModuleType.h"

#include "frc/Solenoid.h"

#include "frc/PowerDistribution.h"

#include "frc/AnalogEncoder.h"

#include "frc/AnalogPotentiometer.h"

#include "frc/DutyCycle.h"

#include "frc/DutyCycleEncoder.h"

#include "frc/Encoder.h"

#include "frc/Servo.h"

#include "frc/IterativeRobotBase.h"

#include "frc/RobotBase.h"

#include "frc/RobotState.h"

#include "frc/TimedRobot.h"

#include "frc/TimesliceRobot.h"

#include "frc/DataLogManager.h"

#include "frc/Filesystem.h"

#include "frc/Notifier.h"

#include "frc/Resource.h"

#include "frc/RobotController.h"

#include "frc/ScopedTracer.h"

#include "frc/Threads.h"

#include "frc/Timer.h"

#include "frc/Tracer.h"

#include "frc/WPILibVersion.h"

#include "frc/Watchdog.h"

#include "frc/Alert.h"

#include "frc/Preferences.h"

#include "frc/StadiaController.h"

#include "frc/PS4Controller.h"

#include "frc/PS5Controller.h"

#include "frc/XboxController.h"

#include "frc/motorcontrol/PWMSparkFlex.h"

#include "frc/motorcontrol/SparkMini.h"

#include "frc/motorcontrol/PWMVictorSPX.h"

#include "frc/motorcontrol/Jaguar.h"

#include "frc/motorcontrol/Victor.h"

#include "frc/motorcontrol/DMC60.h"

#include "frc/motorcontrol/VictorSP.h"

#include "frc/motorcontrol/PWMVenom.h"

#include "frc/motorcontrol/Koors40.h"

#include "frc/motorcontrol/SD540.h"

#include "frc/motorcontrol/Talon.h"

#include "frc/motorcontrol/Spark.h"

#include "frc/motorcontrol/PWMTalonSRX.h"

#include "frc/motorcontrol/PWMTalonFX.h"

#include "frc/motorcontrol/PWMSparkMax.h"

#include "DSCommJoystickPacket.h"

#include "DSCommPacket.h"

#include "HALDataSource.h"

#include "HALProvider.h"

#include "HALSimGui.h"

#include "HALSimGuiExt.h"

#include "SimDeviceGui.h"

#include "HALSimWS.h"

#include "HALSimWSClient.h"

#include "HALSimWSClientConnection.h"

#include "HALSimBaseWebSocketConnection.h"

#include "WSBaseProvider.h"

#include "WSHalProviders.h"

#include "WSProviderContainer.h"

#include "WSProvider_AddressableLED.h"

#include "WSProvider_Analog.h"

#include "WSProvider_DIO.h"

#include "WSProvider_DriverStation.h"

#include "WSProvider_Encoder.h"

#include "WSProvider_HAL.h"

#include "WSProvider_Joystick.h"

#include "WSProvider_PCM.h"

#include "WSProvider_PWM.h"

#include "WSProvider_RoboRIO.h"

#include "WSProvider_SimDevice.h"

#include "WSProvider_Solenoid.h"

#include "WSProvider_dPWM.h"

#include "HALSimHttpConnection.h"

#include "HALSimWSServer.h"

#include "HALSimWeb.h"

#include "HALSimXRP.h"

#include "HALSimXRPClient.h"

#include "XRP.h"

#include "frc2/command/button/CommandPS4Controller.h"

#include "frc2/command/button/CommandPS5Controller.h"

#include "frc2/command/Example.h"

#include "frc/controller/Example.h"

#include "frc/filter/Example.h"

#include "frc/geometry/Example.h"

#include "frc/kinematics/Example.h"

#include "frc/trajectory/Example.h"

#include "units/Example.h"

#include "hal/Example.h"

#include "cameraserver/Example.h"

#include "frc/system/plant/LinearSystemId.h"

#include "frc/system/plant/DCMotor.h"

#include "frc/estimator/Example.h"

#include "frc/system/LinearSystemLoop.h"

#include "frc/Example.h"

"wpi/driverstation/MatchState.hpp"
#include "wpi/driverstation/RobotState.hpp"
#include "wpi/driverstation/Alliance.hpp"
#include "wpi/driverstation/MatchType.hpp"

#include "wpi/hardware/motor/"

"wpi/telemetry/Telemetry.hpp"
#include "wpi/tunables/Tunable.hpp"
#include "wpi/tunables/Selectable.hpp"

"wpi/telemetry/Telemetry.hpp"
#include "wpi/tunables/Tunable.hpp"
#include "wpi/tunables/Selectable.hpp"

// context
wpi::contains;
Object y = wpi::contains;

// context
wpi::contains_lower;
Object y = wpi::contains_lower;

// context
wpi::slice;
Object y = wpi::slice;

// context
wpi::split;
Object y = wpi::split;

// context
wpi::trim;
Object y = wpi::trim;

// context
wpi::remove_prefix;
Object y = wpi::remove_prefix;

// context
wpi::remove_suffix;
Object y = wpi::remove_suffix;

// context
wpi::to_string_view;
Object y = wpi::to_string_view;

// context
wpi::make_string;
Object y = wpi::make_string;

// context
wpi::parse_float;
Object y = wpi::parse_float;

// context
wpi::find_lower;
Object y = wpi::find_lower;

// context
wpi::ct_string;
Object y = wpi::ct_string;

// context
wpi::hexdigit;
Object y = wpi::hexdigit;

// context
wpi::isDigit;
Object y = wpi::isDigit;

// context
wpi::isHexDigit;
Object y = wpi::isHexDigit;

// context
wpi::isPrint;
Object y = wpi::isPrint;

// context
wpi::format_to_n_c_str;
Object y = wpi::format_to_n_c_str;

// context
wpi::PrintTo;
Object y = wpi::PrintTo;

// context
wpi::UnescapeCString;
Object y = wpi::UnescapeCString;

// context
wpi::NullDeleter;
Object y = wpi::NullDeleter;

// context
wpi::DecayedDerivedFrom;
Object y = wpi::DecayedDerivedFrom;

// context
wpi::Event;
Object y = wpi::Event;

// context
wpi::function_ref;
Object y = wpi::function_ref;

// context
wpi::array;
Object y = wpi::array;

// context
wpi::mutex;
Object y = wpi::mutex;

// context
wpi::recursive_spinlock;
Object y = wpi::recursive_spinlock;

// context
wpi::recursive_mutex;
Object y = wpi::recursive_mutex;

// context
wpi::priority_queue;
Object y = wpi::priority_queue;

// context
wpi::condition_variable;
Object y = wpi::condition_variable;

// context
wpi::spinlock;
Object y = wpi::spinlock;

// context
wpi::circular_buffer;
Object y = wpi::circular_buffer;

// context
wpi::unique_function;
Object y = wpi::unique_function;

// context
wpi::insert_sorted;
Object y = wpi::insert_sorted;

// context
wpi::FastQueue;
Object y = wpi::FastQueue;

// context
wpi::MemoryBuffer;
Object y = wpi::MemoryBuffer;

// context
wpi::array;
Object y = wpi::array;

// context
wpi::empty_array;
Object y = wpi::empty_array;

// context
wpi::expected;
Object y = wpi::expected;

// context
wpi::unexpected;
Object y = wpi::unexpected;

// context
wpi::byteswap;
Object y = wpi::byteswap;

// context
wpi::for_each;
Object y = wpi::for_each;

// context
wpi::Base64Decode;
Object y = wpi::Base64Decode;

// context
wpi::EventVector;
Object y = wpi::EventVector;

// context
wpi::GetStackTrace;
Object y = wpi::GetStackTrace;

// context
wpi::Lerp;
Object y = wpi::Lerp;

// context
wpi::DecodeLimits;
Object y = wpi::DecodeLimits;

// context
wpi::NumToCtString;
Object y = wpi::NumToCtString;

// context
wpi::CallbackListenerData;
Object y = wpi::CallbackListenerData;

// context
wpi::CallbackThread;
Object y = wpi::CallbackThread;

// context
wpi::CallbackManager;
Object y = wpi::CallbackManager;

// context
wpi::DenseMap;
Object y = wpi::DenseMap;

// context
wpi::CreateEvent;
Object y = wpi::CreateEvent;

// context
wpi::print;
Object y = wpi::print;

// context
wpi::is_constexpr;
Object y = wpi::is_constexpr;

// context
wpi::sgn;
Object y = wpi::sgn;

// context
wpi::json;
Object y = wpi::json;

// context
wpi::WPI_LOG_INFO;
Object y = wpi::WPI_LOG_INFO;

// context
wpi::WPI_LOG_CRITICAL;
Object y = wpi::WPI_LOG_CRITICAL;

// context
wpi::WPI_LOG_ERROR;
Object y = wpi::WPI_LOG_ERROR;

// context
wpi::WPI_LOG_WARNING;
Object y = wpi::WPI_LOG_WARNING;

// context
wpi::WPI_LOG_DEBUG;
Object y = wpi::WPI_LOG_DEBUG;

// context
wpi::WPI_LOG_DEBUG1;
Object y = wpi::WPI_LOG_DEBUG1;

// context
wpi::WPI_LOG_DEBUG2;
Object y = wpi::WPI_LOG_DEBUG2;

// context
wpi::WPI_LOG_DEBUG3;
Object y = wpi::WPI_LOG_DEBUG3;

// context
wpi::WPI_LOG_DEBUG4;
Object y = wpi::WPI_LOG_DEBUG4;

// context
wpi::sys::windows;
Object y = wpi::sys::windows;

// context
wpi::UTF16;
Object y = wpi::UTF16;

// context
wpi::convertUTF16ToUTF8String;
Object y = wpi::convertUTF16ToUTF8String;

// context
wpi::Now;
Object y = wpi::Now;

// context
wpi::SetNowImpl;
Object y = wpi::SetNowImpl;

// context
wpi::NowDefault;
Object y = wpi::NowDefault;

// context
wpi::GetSystemTime;
Object y = wpi::GetSystemTime;

// context
wpi::RawFrame;
Object y = wpi::RawFrame;

// context
wpi::SetFrameData;
Object y = wpi::SetFrameData;

// context
wpi::SignalObject;
Object y = wpi::SignalObject;

// context
wpi::SetEvent;
Object y = wpi::SetEvent;

// context
wpi::SafeThreadEvent;
Object y = wpi::SafeThreadEvent;

// context
wpi::WaitForObject;
Object y = wpi::WaitForObject;

// context
wpi::WaitForObjects;
Object y = wpi::WaitForObjects;

// context
wpi::iterator_range;
Object y = wpi::iterator_range;

// context
wpi::GetTypeName;
Object y = wpi::GetTypeName;

// context
wpi::Concat;
Object y = wpi::Concat;

// context
wpi::Struct;
Object y = wpi::Struct;

// context
wpi::Protobuf;
Object y = wpi::Protobuf;

// context
wpi::ProtobufSerializable;
Object y = wpi::ProtobufSerializable;

// context
wpi::StructSerializable;
Object y = wpi::StructSerializable;

// context
wpi::ProtobufMessage;
Object y = wpi::ProtobufMessage;

// context
wpi::ForEachStructSchema;
Object y = wpi::ForEachStructSchema;

// context
wpi::StructArrayBuffer;
Object y = wpi::StructArrayBuffer;

// context
wpi::MakeStructArrayTypeString;
Object y = wpi::MakeStructArrayTypeString;

// context
wpi::UnpackStructInto;
Object y = wpi::UnpackStructInto;

// context
wpi::GetStructTypeString;
Object y = wpi::GetStructTypeString;

// context
wpi::UnpackStruct;
Object y = wpi::UnpackStruct;

// context
wpi::PackStruct;
Object y = wpi::PackStruct;

// context
wpi::GetStructSize;
Object y = wpi::GetStructSize;

// context
wpi::UnpackCallback;
Object y = wpi::UnpackCallback;

// context
wpi::PackCallback;
Object y = wpi::PackCallback;

// context
wpi::StdVectorUnpackCallback;
Object y = wpi::StdVectorUnpackCallback;

// context
wpi::ProtoInputStream;
Object y = wpi::ProtoInputStream;

// context
wpi::ProtoOutputStream;
Object y = wpi::ProtoOutputStream;

// context
wpi::HasNestedStruct;
Object y = wpi::HasNestedStruct;

// context
wpi::WpiArrayUnpackCallback;
Object y = wpi::WpiArrayUnpackCallback;

// context
wpi::UnpackStructArray;
Object y = wpi::UnpackStructArray;

// context
wpi::PackStructArray;
Object y = wpi::PackStructArray;

// context
wpi::StructFieldDescriptor;
Object y = wpi::StructFieldDescriptor;

// context
wpi::DynamicStruct;
Object y = wpi::DynamicStruct;

// context
wpi::StructFieldType;
Object y = wpi::StructFieldType;

// context
wpi::StructDescriptorDatabase;
Object y = wpi::StructDescriptorDatabase;

// context
wpi::Sendable;
Object y = wpi::Sendable;

// context
wpi::SendableBuilder;
Object y = wpi::SendableBuilder;

// context
wpi::SendableHelper;
Object y = wpi::SendableHelper;

// context
wpi::SendableRegistry;
Object y = wpi::SendableRegistry;

// context
wpi::support::endian;
Object y = wpi::support::endian;

// context
wpi::endianness::native;
Object y = wpi::endianness::native;

// context
wpi::sig::ScopedConnection;
Object y = wpi::sig::ScopedConnection;

// context
wpi::sig::Signal;
Object y = wpi::sig::Signal;

// context
wpi::sig::Signal_mt;
Object y = wpi::sig::Signal_mt;

// context
wpi::sig::SignalBase;
Object y = wpi::sig::SignalBase;

// context
wpi::SetSignalObject;
Object y = wpi::SetSignalObject;

// context
wpi::DenseMap;
Object y = wpi::DenseMap;

// context
wpi::Logger;
Object y = wpi::Logger;

// context
wpi::SmallDenseMap;
Object y = wpi::SmallDenseMap;

// context
wpi::SmallPtrSet;
Object y = wpi::SmallPtrSet;

// context
wpi::SmallSet;
Object y = wpi::SmallSet;

// context
wpi::SmallString;
Object y = wpi::SmallString;

// context
wpi::SmallVector;
Object y = wpi::SmallVector;

// context
wpi::SmallVectorImpl;
Object y = wpi::SmallVectorImpl;

// context
wpi::StringMap;
Object y = wpi::StringMap;

// context
wpi::drop_back;
Object y = wpi::drop_back;

// context
wpi::drop_front;
Object y = wpi::drop_front;

// context
wpi::ends_with;
Object y = wpi::ends_with;

// context
wpi::ends_with_lower;
Object y = wpi::ends_with_lower;

// context
wpi::equals_lower;
Object y = wpi::equals_lower;

// context
wpi::ltrim;
Object y = wpi::ltrim;

// context
wpi::rsplit;
Object y = wpi::rsplit;

// context
wpi::rtrim;
Object y = wpi::rtrim;

// context
wpi::starts_with;
Object y = wpi::starts_with;

// context
wpi::substr;
Object y = wpi::substr;

// context
wpi::take_back;
Object y = wpi::take_back;

// context
wpi::take_front;
Object y = wpi::take_front;

// context
wpi::hexDigitValue;
Object y = wpi::hexDigitValue;

// context
wpi::parse_integer;
Object y = wpi::parse_integer;

// context
wpi::SafeThread;
Object y = wpi::SafeThread;

// context
wpi::SafeThreadOwner;
Object y = wpi::SafeThreadOwner;

// context
wpi::PromiseFactory;
Object y = wpi::PromiseFactory;

// context
wpi::raw_istream;
Object y = wpi::raw_istream;

// context
wpi::raw_ostream;
Object y = wpi::raw_ostream;

// context
wpi::raw_svector_ostream;
Object y = wpi::raw_svector_ostream;

// context
wpi::raw_uvector_ostream;
Object y = wpi::raw_uvector_ostream;

// context
wpi::raw_string_ostream;
Object y = wpi::raw_string_ostream;

// context
wpi::raw_fd_istream;
Object y = wpi::raw_fd_istream;

// context
wpi::raw_fd_ostream;
Object y = wpi::raw_fd_ostream;

// context
wpi::safe_malloc;
Object y = wpi::safe_malloc;

// context
wpi::safe_calloc;
Object y = wpi::safe_calloc;

// context
wpi::SHA1;
Object y = wpi::SHA1;

// context
wpi::future<;
Object y = wpi::future<;

// context
wpi::promise<;
Object y = wpi::promise<;

// context
wpi::SpanEq;
Object y = wpi::SpanEq;

// context
wpi::Base64Encode;
Object y = wpi::Base64Encode;

// context
wpi::UidVector;
Object y = wpi::UidVector;

// context
wpi::java;
Object y = wpi::java;

// context
wpi::kHandleType;
Object y = wpi::kHandleType;

// context
support::endian::;
Object y = support::endian::;

// context
frc::Pose2d;
Object y = frc::Pose2d;

// context
(Pose2d;
Object y = (Pose2d;

// context
Pose2d;
Object y = Pose2d;

// context
frc::Pose3d;
Object y = frc::Pose3d;

// context
(Pose3d;
Object y = (Pose3d;

// context
Pose3d;
Object y = Pose3d;

// context
frc::Quaternion;
Object y = frc::Quaternion;

// context
(Quaternion;
Object y = (Quaternion;

// context
Quaternion;
Object y = Quaternion;

// context
frc::Rotation2d;
Object y = frc::Rotation2d;

// context
(Rotation2d;
Object y = (Rotation2d;

// context
Rotation2d;
Object y = Rotation2d;

// context
frc::Rotation3d;
Object y = frc::Rotation3d;

// context
(Rotation3d;
Object y = (Rotation3d;

// context
Rotation3d;
Object y = Rotation3d;

// context
frc::Transform2d;
Object y = frc::Transform2d;

// context
(Transform2d;
Object y = (Transform2d;

// context
Transform2d;
Object y = Transform2d;

// context
frc::Transform3d;
Object y = frc::Transform3d;

// context
(Transform3d;
Object y = (Transform3d;

// context
Transform3d;
Object y = Transform3d;

// context
frc::Translation2d;
Object y = frc::Translation2d;

// context
(Translation2d;
Object y = (Translation2d;

// context
Translation2d;
Object y = Translation2d;

// context
frc::Translation3d;
Object y = frc::Translation3d;

// context
(Translation3d;
Object y = (Translation3d;

// context
Translation3d;
Object y = Translation3d;

// context
frc::LinearSystem;
Object y = frc::LinearSystem;

// context
(LinearSystem;
Object y = (LinearSystem;

// context
LinearSystem;
Object y = LinearSystem;

// context
frc::LinearSystemLoop;
Object y = frc::LinearSystemLoop;

// context
(LinearSystemLoop;
Object y = (LinearSystemLoop;

// context
LinearSystemLoop;
Object y = LinearSystemLoop;

// context
frc::InputModulus;
Object y = frc::InputModulus;

// context
(InputModulus;
Object y = (InputModulus;

// context
InputModulus;
Object y = InputModulus;

// context
frc::DCMotor;
Object y = frc::DCMotor;

// context
(DCMotor;
Object y = (DCMotor;

// context
DCMotor;
Object y = DCMotor;

// context
frc::Matrixd;
Object y = frc::Matrixd;

// context
(Matrixd;
Object y = (Matrixd;

// context
Matrixd;
Object y = Matrixd;

// context
frc::Vectord;
Object y = frc::Vectord;

// context
(Vectord;
Object y = (Vectord;

// context
Vectord;
Object y = Vectord;

// context
frc::MakeWhiteNoiseVector;
Object y = frc::MakeWhiteNoiseVector;

// context
(MakeWhiteNoiseVector;
Object y = (MakeWhiteNoiseVector;

// context
MakeWhiteNoiseVector;
Object y = MakeWhiteNoiseVector;

// context
frc::DesaturateInputVector;
Object y = frc::DesaturateInputVector;

// context
(DesaturateInputVector;
Object y = (DesaturateInputVector;

// context
DesaturateInputVector;
Object y = DesaturateInputVector;

// context
frc::PIDController;
Object y = frc::PIDController;

// context
(PIDController;
Object y = (PIDController;

// context
PIDController;
Object y = PIDController;

// context
frc::ProfiledPIDController;
Object y = frc::ProfiledPIDController;

// context
(ProfiledPIDController;
Object y = (ProfiledPIDController;

// context
ProfiledPIDController;
Object y = ProfiledPIDController;

// context
frc::FloorMod;
Object y = frc::FloorMod;

// context
(FloorMod;
Object y = (FloorMod;

// context
FloorMod;
Object y = FloorMod;

// context
frc::ChassisSpeeds;
Object y = frc::ChassisSpeeds;

// context
(ChassisSpeeds;
Object y = (ChassisSpeeds;

// context
ChassisSpeeds;
Object y = ChassisSpeeds;

// context
frc::DifferentialDriveKinematics;
Object y = frc::DifferentialDriveKinematics;

// context
(DifferentialDriveKinematics;
Object y = (DifferentialDriveKinematics;

// context
DifferentialDriveKinematics;
Object y = DifferentialDriveKinematics;

// context
frc::DifferentialDriveKinematicsConstraint;
Object y = frc::DifferentialDriveKinematicsConstraint;

// context
(DifferentialDriveKinematicsConstraint;
Object y = (DifferentialDriveKinematicsConstraint;

// context
DifferentialDriveKinematicsConstraint;
Object y = DifferentialDriveKinematicsConstraint;

// context
frc::DifferentialDriveWheelSpeeds;
Object y = frc::DifferentialDriveWheelSpeeds;

// context
(DifferentialDriveWheelSpeeds;
Object y = (DifferentialDriveWheelSpeeds;

// context
DifferentialDriveWheelSpeeds;
Object y = DifferentialDriveWheelSpeeds;

// context
frc::DifferentialDriveOdometry;
Object y = frc::DifferentialDriveOdometry;

// context
(DifferentialDriveOdometry;
Object y = (DifferentialDriveOdometry;

// context
DifferentialDriveOdometry;
Object y = DifferentialDriveOdometry;

// context
frc::DifferentialDrivePoseEstimator;
Object y = frc::DifferentialDrivePoseEstimator;

// context
(DifferentialDrivePoseEstimator;
Object y = (DifferentialDrivePoseEstimator;

// context
DifferentialDrivePoseEstimator;
Object y = DifferentialDrivePoseEstimator;

// context
frc::MecanumDriveWheelPositions;
Object y = frc::MecanumDriveWheelPositions;

// context
(MecanumDriveWheelPositions;
Object y = (MecanumDriveWheelPositions;

// context
MecanumDriveWheelPositions;
Object y = MecanumDriveWheelPositions;

// context
frc::MecanumDriveWheelSpeeds;
Object y = frc::MecanumDriveWheelSpeeds;

// context
(MecanumDriveWheelSpeeds;
Object y = (MecanumDriveWheelSpeeds;

// context
MecanumDriveWheelSpeeds;
Object y = MecanumDriveWheelSpeeds;

// context
frc::MecanumDriveKinematics;
Object y = frc::MecanumDriveKinematics;

// context
(MecanumDriveKinematics;
Object y = (MecanumDriveKinematics;

// context
MecanumDriveKinematics;
Object y = MecanumDriveKinematics;

// context
frc::MecanumDriveOdometry;
Object y = frc::MecanumDriveOdometry;

// context
(MecanumDriveOdometry;
Object y = (MecanumDriveOdometry;

// context
MecanumDriveOdometry;
Object y = MecanumDriveOdometry;

// context
frc::MecanumDrivePoseEstimator;
Object y = frc::MecanumDrivePoseEstimator;

// context
(MecanumDrivePoseEstimator;
Object y = (MecanumDrivePoseEstimator;

// context
MecanumDrivePoseEstimator;
Object y = MecanumDrivePoseEstimator;

// context
frc::SwerveModuleState;
Object y = frc::SwerveModuleState;

// context
(SwerveModuleState;
Object y = (SwerveModuleState;

// context
SwerveModuleState;
Object y = SwerveModuleState;

// context
frc::SwerveModulePosition;
Object y = frc::SwerveModulePosition;

// context
(SwerveModulePosition;
Object y = (SwerveModulePosition;

// context
SwerveModulePosition;
Object y = SwerveModulePosition;

// context
frc::SwerveDriveKinematics;
Object y = frc::SwerveDriveKinematics;

// context
(SwerveDriveKinematics;
Object y = (SwerveDriveKinematics;

// context
SwerveDriveKinematics;
Object y = SwerveDriveKinematics;

// context
frc::SwerveDriveOdometry;
Object y = frc::SwerveDriveOdometry;

// context
(SwerveDriveOdometry;
Object y = (SwerveDriveOdometry;

// context
SwerveDriveOdometry;
Object y = SwerveDriveOdometry;

// context
frc::SwerveDrivePoseEstimator;
Object y = frc::SwerveDrivePoseEstimator;

// context
(SwerveDrivePoseEstimator;
Object y = (SwerveDrivePoseEstimator;

// context
SwerveDrivePoseEstimator;
Object y = SwerveDrivePoseEstimator;

// context
frc::LinearPlantInversionFeedforward;
Object y = frc::LinearPlantInversionFeedforward;

// context
(LinearPlantInversionFeedforward;
Object y = (LinearPlantInversionFeedforward;

// context
LinearPlantInversionFeedforward;
Object y = LinearPlantInversionFeedforward;

// context
frc::LinearQuadraticRegulator;
Object y = frc::LinearQuadraticRegulator;

// context
(LinearQuadraticRegulator;
Object y = (LinearQuadraticRegulator;

// context
LinearQuadraticRegulator;
Object y = LinearQuadraticRegulator;

// context
frc::SimpleMotorFeedforward;
Object y = frc::SimpleMotorFeedforward;

// context
(SimpleMotorFeedforward;
Object y = (SimpleMotorFeedforward;

// context
SimpleMotorFeedforward;
Object y = SimpleMotorFeedforward;

// context
frc::ElevatorFeedforward;
Object y = frc::ElevatorFeedforward;

// context
(ElevatorFeedforward;
Object y = (ElevatorFeedforward;

// context
ElevatorFeedforward;
Object y = ElevatorFeedforward;

// context
frc::BangBangController;
Object y = frc::BangBangController;

// context
(BangBangController;
Object y = (BangBangController;

// context
BangBangController;
Object y = BangBangController;

// context
frc::LTVUnicycleController;
Object y = frc::LTVUnicycleController;

// context
(LTVUnicycleController;
Object y = (LTVUnicycleController;

// context
LTVUnicycleController;
Object y = LTVUnicycleController;

// context
frc::Trajectory;
Object y = frc::Trajectory;

// context
(Trajectory;
Object y = (Trajectory;

// context
Trajectory;
Object y = Trajectory;

// context
frc::TrajectoryConfig;
Object y = frc::TrajectoryConfig;

// context
(TrajectoryConfig;
Object y = (TrajectoryConfig;

// context
TrajectoryConfig;
Object y = TrajectoryConfig;

// context
frc::TrajectoryGenerator;
Object y = frc::TrajectoryGenerator;

// context
(TrajectoryGenerator;
Object y = (TrajectoryGenerator;

// context
TrajectoryGenerator;
Object y = TrajectoryGenerator;

// context
frc::DiscretizeAB;
Object y = frc::DiscretizeAB;

// context
(DiscretizeAB;
Object y = (DiscretizeAB;

// context
DiscretizeAB;
Object y = DiscretizeAB;

// context
frc::RKDP;
Object y = frc::RKDP;

// context
(RKDP;
Object y = (RKDP;

// context
RKDP;
Object y = RKDP;

// context
frc::LinearFilter;
Object y = frc::LinearFilter;

// context
(LinearFilter;
Object y = (LinearFilter;

// context
LinearFilter;
Object y = LinearFilter;

// context
frc::LinearSystem;
Object y = frc::LinearSystem;

// context
(LinearSystem;
Object y = (LinearSystem;

// context
LinearSystem;
Object y = LinearSystem;

// context
frc::LinearSystemId;
Object y = frc::LinearSystemId;

// context
(LinearSystemId;
Object y = (LinearSystemId;

// context
LinearSystemId;
Object y = LinearSystemId;

// context
LinearSystemId::SingleJointedArmSystem;
Object y = LinearSystemId::SingleJointedArmSystem;

// context
LinearSystemId::FlywheelSystem;
Object y = LinearSystemId::FlywheelSystem;

// context
LinearSystemId::ElevatorSystem;
Object y = LinearSystemId::ElevatorSystem;

// context
Models::SingleJointedArmFromPhysicalConstants;
Object y = Models::SingleJointedArmFromPhysicalConstants;

// context
Models::FlywheelFromPhysicalConstants;
Object y = Models::FlywheelFromPhysicalConstants;

// context
Models::ElevatorFromPhysicalConstants;
Object y = Models::ElevatorFromPhysicalConstants;

// context
Models::FlywheelFromSysId;
Object y = Models::FlywheelFromSysId;

// context
Models::SingleJointedArmFromSysId;
Object y = Models::SingleJointedArmFromSysId;

// context
Models::ElevatorFromSysId;
Object y = Models::ElevatorFromSysId;

// context
frc::MedianFilter;
Object y = frc::MedianFilter;

// context
(MedianFilter;
Object y = (MedianFilter;

// context
MedianFilter;
Object y = MedianFilter;

// context
frc::Debouncer;
Object y = frc::Debouncer;

// context
(Debouncer;
Object y = (Debouncer;

// context
Debouncer;
Object y = Debouncer;

// context
frc::ApplyDeadband;
Object y = frc::ApplyDeadband;

// context
(ApplyDeadband;
Object y = (ApplyDeadband;

// context
ApplyDeadband;
Object y = ApplyDeadband;

// context
frc::CopySignPow;
Object y = frc::CopySignPow;

// context
(CopySignPow;
Object y = (CopySignPow;

// context
CopySignPow;
Object y = CopySignPow;

// context
frc::CopyDirectionPow;
Object y = frc::CopyDirectionPow;

// context
(CopyDirectionPow;
Object y = (CopyDirectionPow;

// context
CopyDirectionPow;
Object y = CopyDirectionPow;

// context
frc::Debouncer;
Object y = frc::Debouncer;

// context
(Debouncer;
Object y = (Debouncer;

// context
Debouncer;
Object y = Debouncer;

// context
frc::TrapezoidProfile;
Object y = frc::TrapezoidProfile;

// context
(TrapezoidProfile;
Object y = (TrapezoidProfile;

// context
TrapezoidProfile;
Object y = TrapezoidProfile;

// context
frc::ExponentialProfile;
Object y = frc::ExponentialProfile;

// context
(ExponentialProfile;
Object y = (ExponentialProfile;

// context
ExponentialProfile;
Object y = ExponentialProfile;

// context
frc::SlewRateLimiter;
Object y = frc::SlewRateLimiter;

// context
(SlewRateLimiter;
Object y = (SlewRateLimiter;

// context
SlewRateLimiter;
Object y = SlewRateLimiter;

// context
frc::KalmanFilter;
Object y = frc::KalmanFilter;

// context
(KalmanFilter;
Object y = (KalmanFilter;

// context
KalmanFilter;
Object y = KalmanFilter;

// context
frc::Debouncer;
Object y = frc::Debouncer;

// context
(Debouncer;
Object y = (Debouncer;

// context
Debouncer;
Object y = Debouncer;

// context
frc::TravelingSalesman;
Object y = frc::TravelingSalesman;

// context
(TravelingSalesman;
Object y = (TravelingSalesman;

// context
TravelingSalesman;
Object y = TravelingSalesman;

// context
wpi::math::wpi::math::;
Object y = wpi::math::wpi::math::;

// context
wpi::math::wpi::math::;
Object y = wpi::math::wpi::math::;

// context
units::;
Object y = units::;

// context
units::;
Object y = units::;

// context
wpi::wpi::units::;
Object y = wpi::wpi::units::;

// context
frc::OnBoardIO;
Object y = frc::OnBoardIO;

// context
frc::XRP;
Object y = frc::XRP;

// context
frc::Romi;
Object y = frc::Romi;

// context
frc::AprilTagFieldLayout;
Object y = frc::AprilTagFieldLayout;

// context
wpi::apriltag::AprilTagFieldLayout;
Object y = wpi::apriltag::AprilTagFieldLayout;

// context
frc::AprilTagField;
Object y = frc::AprilTagField;

// context
wpi::apriltag::AprilTagField;
Object y = wpi::apriltag::AprilTagField;

// context
wpi::fields::Field::LoadField;
Object y = wpi::fields::Field::LoadField;

// context
FieldId::k2022RapidReact;
Object y = FieldId::k2022RapidReact;

// context
FieldId::k2023ChargedUp;
Object y = FieldId::k2023ChargedUp;

// context
FieldId::k2024Crescendo;
Object y = FieldId::k2024Crescendo;

// context
FieldId::k2025ReefscapeAndyMark;
Object y = FieldId::k2025ReefscapeAndyMark;

// context
FieldId::k2025ReefscapeWelded;
Object y = FieldId::k2025ReefscapeWelded;

// context
FieldId::k2026RebuiltAndyMark;
Object y = FieldId::k2026RebuiltAndyMark;

// context
FieldId::k2026RebuiltWelded;
Object y = FieldId::k2026RebuiltWelded;

// context
FieldId::kDefaultField;
Object y = FieldId::kDefaultField;

// context
frc::April;
Object y = frc::April;

// context
cs::;
Object y = cs::;

// context
wpi::nt::;
Object x = wpi::nt::;

// context
frc::ObjectToRobotPose;
Object y = frc::ObjectToRobotPose;

// context
frc2::CommandPS4Controller;
Object y = frc2::CommandPS4Controller;

// context
frc2::CommandPS5Controller;
Object y = frc2::CommandPS5Controller;

// context
frc::Color8Bit;
Object y = frc::Color8Bit;

// context
frc::Color;
Object y = frc::Color;

// context
frc2::cmd::;
Object y = frc2::cmd::;

// context
frc2::;
Object y = frc2::;

// context
frc::;
Object y = frc::;

// context
hal::;
Object y = hal::;

// context
FRC_ReportError;
Object y = FRC_ReportError;

// context
GradientType::kContinuous;
Object y = GradientType::kContinuous;

// context
GradientType::kDiscrete;
Object y = GradientType::kDiscrete;

// context
CTREPCM;
Object y = CTREPCM;

// context
REVPH;
Object y = REVPH;

// context
DoubleSolenoid::Value::kOff;
Object y = DoubleSolenoid::Value::kOff;

// context
DoubleSolenoid::Value::kForward;
Object y = DoubleSolenoid::Value::kForward;

// context
DoubleSolenoid::Value::kReverse;
Object y = DoubleSolenoid::Value::kReverse;

// context
ColorOrder::kRGB;
Object y = ColorOrder::kRGB;

// context
ColorOrder::kBGR;
Object y = ColorOrder::kBGR;

// context
ColorOrder::kGRB;
Object y = ColorOrder::kGRB;

// context
ColorOrder::kBRG;
Object y = ColorOrder::kBRG;

// context
ColorOrder::kRBG;
Object y = ColorOrder::kRBG;

// context
ColorOrder::kGBR;
Object y = ColorOrder::kGBR;

// context
Color::kLightGoldenrodYellow;
Object y = Color::kLightGoldenrodYellow;

// context
Color::kMediumSpringGreen;
Object y = Color::kMediumSpringGreen;

// context
Color::kMediumAquamarine;
Object y = Color::kMediumAquamarine;

// context
Color::kMediumSlateBlue;
Object y = Color::kMediumSlateBlue;

// context
Color::kMediumTurquoise;
Object y = Color::kMediumTurquoise;

// context
Color::kMediumVioletRed;
Object y = Color::kMediumVioletRed;

// context
Color::kBlanchedAlmond;
Object y = Color::kBlanchedAlmond;

// context
Color::kCornflowerBlue;
Object y = Color::kCornflowerBlue;

// context
Color::kDarkOliveGreen;
Object y = Color::kDarkOliveGreen;

// context
Color::kLightSlateGray;
Object y = Color::kLightSlateGray;

// context
Color::kLightSteelBlue;
Object y = Color::kLightSteelBlue;

// context
Color::kMediumSeaGreen;
Object y = Color::kMediumSeaGreen;

// context
Color::kDarkGoldenrod;
Object y = Color::kDarkGoldenrod;

// context
Color::kDarkSlateBlue;
Object y = Color::kDarkSlateBlue;

// context
Color::kDarkSlateGray;
Object y = Color::kDarkSlateGray;

// context
Color::kDarkTurquoise;
Object y = Color::kDarkTurquoise;

// context
Color::kLavenderBlush;
Object y = Color::kLavenderBlush;

// context
Color::kLightSeaGreen;
Object y = Color::kLightSeaGreen;

// context
Color::kPaleGoldenrod;
Object y = Color::kPaleGoldenrod;

// context
Color::kPaleTurquoise;
Object y = Color::kPaleTurquoise;

// context
Color::kPaleVioletRed;
Object y = Color::kPaleVioletRed;

// context
Color::kAntiqueWhite;
Object y = Color::kAntiqueWhite;

// context
Color::kDarkSeaGreen;
Object y = Color::kDarkSeaGreen;

// context
Color::kLemonChiffon;
Object y = Color::kLemonChiffon;

// context
Color::kLightSkyBlue;
Object y = Color::kLightSkyBlue;

// context
Color::kMediumOrchid;
Object y = Color::kMediumOrchid;

// context
Color::kMediumPurple;
Object y = Color::kMediumPurple;

// context
Color::kMidnightBlue;
Object y = Color::kMidnightBlue;

// context
Color::kDarkMagenta;
Object y = Color::kDarkMagenta;

// context
Color::kDeepSkyBlue;
Object y = Color::kDeepSkyBlue;

// context
Color::kFloralWhite;
Object y = Color::kFloralWhite;

// context
Color::kForestGreen;
Object y = Color::kForestGreen;

// context
Color::kGreenYellow;
Object y = Color::kGreenYellow;

// context
Color::kLightSalmon;
Object y = Color::kLightSalmon;

// context
Color::kLightYellow;
Object y = Color::kLightYellow;

// context
Color::kNavajoWhite;
Object y = Color::kNavajoWhite;

// context
Color::kSaddleBrown;
Object y = Color::kSaddleBrown;

// context
Color::kSpringGreen;
Object y = Color::kSpringGreen;

// context
Color::kYellowGreen;
Object y = Color::kYellowGreen;

// context
Color::kAquamarine;
Object y = Color::kAquamarine;

// context
Color::kBlueViolet;
Object y = Color::kBlueViolet;

// context
Color::kChartreuse;
Object y = Color::kChartreuse;

// context
Color::kDarkOrange;
Object y = Color::kDarkOrange;

// context
Color::kDarkOrchid;
Object y = Color::kDarkOrchid;

// context
Color::kDarkSalmon;
Object y = Color::kDarkSalmon;

// context
Color::kDarkViolet;
Object y = Color::kDarkViolet;

// context
Color::kDodgerBlue;
Object y = Color::kDodgerBlue;

// context
Color::kGhostWhite;
Object y = Color::kGhostWhite;

// context
Color::kLightCoral;
Object y = Color::kLightCoral;

// context
Color::kLightGreen;
Object y = Color::kLightGreen;

// context
Color::kMediumBlue;
Object y = Color::kMediumBlue;

// context
Color::kPapayaWhip;
Object y = Color::kPapayaWhip;

// context
Color::kPowderBlue;
Object y = Color::kPowderBlue;

// context
Color::kSandyBrown;
Object y = Color::kSandyBrown;

// context
Color::kWhiteSmoke;
Object y = Color::kWhiteSmoke;

// context
Color::kAliceBlue;
Object y = Color::kAliceBlue;

// context
Color::kBurlywood;
Object y = Color::kBurlywood;

// context
Color::kCadetBlue;
Object y = Color::kCadetBlue;

// context
Color::kChocolate;
Object y = Color::kChocolate;

// context
Color::kDarkGreen;
Object y = Color::kDarkGreen;

// context
Color::kDarkKhaki;
Object y = Color::kDarkKhaki;

// context
Color::kFirebrick;
Object y = Color::kFirebrick;

// context
Color::kFirstBlue;
Object y = Color::kFirstBlue;

// context
Color::kGainsboro;
Object y = Color::kGainsboro;

// context
Color::kGoldenrod;
Object y = Color::kGoldenrod;

// context
Color::kIndianRed;
Object y = Color::kIndianRed;

// context
Color::kLawnGreen;
Object y = Color::kLawnGreen;

// context
Color::kLightBlue;
Object y = Color::kLightBlue;

// context
Color::kLightCyan;
Object y = Color::kLightCyan;

// context
Color::kLightGray;
Object y = Color::kLightGray;

// context
Color::kLightPink;
Object y = Color::kLightPink;

// context
Color::kLimeGreen;
Object y = Color::kLimeGreen;

// context
Color::kMintcream;
Object y = Color::kMintcream;

// context
Color::kMistyRose;
Object y = Color::kMistyRose;

// context
Color::kOliveDrab;
Object y = Color::kOliveDrab;

// context
Color::kOrangeRed;
Object y = Color::kOrangeRed;

// context
Color::kPaleGreen;
Object y = Color::kPaleGreen;

// context
Color::kPeachPuff;
Object y = Color::kPeachPuff;

// context
Color::kRosyBrown;
Object y = Color::kRosyBrown;

// context
Color::kRoyalBlue;
Object y = Color::kRoyalBlue;

// context
Color::kSlateBlue;
Object y = Color::kSlateBlue;

// context
Color::kSlateGray;
Object y = Color::kSlateGray;

// context
Color::kSteelBlue;
Object y = Color::kSteelBlue;

// context
Color::kTurquoise;
Object y = Color::kTurquoise;

// context
Color::kCornsilk;
Object y = Color::kCornsilk;

// context
Color::kDarkBlue;
Object y = Color::kDarkBlue;

// context
Color::kDarkCyan;
Object y = Color::kDarkCyan;

// context
Color::kDarkGray;
Object y = Color::kDarkGray;

// context
Color::kDeepPink;
Object y = Color::kDeepPink;

// context
Color::kFirstRed;
Object y = Color::kFirstRed;

// context
Color::kHoneydew;
Object y = Color::kHoneydew;

// context
Color::kLavender;
Object y = Color::kLavender;

// context
Color::kMoccasin;
Object y = Color::kMoccasin;

// context
Color::kSeaGreen;
Object y = Color::kSeaGreen;

// context
Color::kSeashell;
Object y = Color::kSeashell;

// context
Color::kCrimson;
Object y = Color::kCrimson;

// context
Color::kDarkRed;
Object y = Color::kDarkRed;

// context
Color::kDimGray;
Object y = Color::kDimGray;

// context
Color::kFuchsia;
Object y = Color::kFuchsia;

// context
Color::kHotPink;
Object y = Color::kHotPink;

// context
Color::kMagenta;
Object y = Color::kMagenta;

// context
Color::kOldLace;
Object y = Color::kOldLace;

// context
Color::kSkyBlue;
Object y = Color::kSkyBlue;

// context
Color::kThistle;
Object y = Color::kThistle;

// context
Color::kBisque;
Object y = Color::kBisque;

// context
Color::kIndigo;
Object y = Color::kIndigo;

// context
Color::kMaroon;
Object y = Color::kMaroon;

// context
Color::kOrange;
Object y = Color::kOrange;

// context
Color::kOrchid;
Object y = Color::kOrchid;

// context
Color::kPurple;
Object y = Color::kPurple;

// context
Color::kSalmon;
Object y = Color::kSalmon;

// context
Color::kSienna;
Object y = Color::kSienna;

// context
Color::kSilver;
Object y = Color::kSilver;

// context
Color::kTomato;
Object y = Color::kTomato;

// context
Color::kViolet;
Object y = Color::kViolet;

// context
Color::kYellow;
Object y = Color::kYellow;

// context
Color::kAzure;
Object y = Color::kAzure;

// context
Color::kBeige;
Object y = Color::kBeige;

// context
Color::kBlack;
Object y = Color::kBlack;

// context
Color::kBrown;
Object y = Color::kBrown;

// context
Color::kCoral;
Object y = Color::kCoral;

// context
Color::kDenim;
Object y = Color::kDenim;

// context
Color::kGreen;
Object y = Color::kGreen;

// context
Color::kIvory;
Object y = Color::kIvory;

// context
Color::kKhaki;
Object y = Color::kKhaki;

// context
Color::kLinen;
Object y = Color::kLinen;

// context
Color::kOlive;
Object y = Color::kOlive;

// context
Color::kWheat;
Object y = Color::kWheat;

// context
Color::kWhite;
Object y = Color::kWhite;

// context
Color::kAqua;
Object y = Color::kAqua;

// context
Color::kBlue;
Object y = Color::kBlue;

// context
Color::kCyan;
Object y = Color::kCyan;

// context
Color::kGold;
Object y = Color::kGold;

// context
Color::kGray;
Object y = Color::kGray;

// context
Color::kLime;
Object y = Color::kLime;

// context
Color::kNavy;
Object y = Color::kNavy;

// context
Color::kPeru;
Object y = Color::kPeru;

// context
Color::kPink;
Object y = Color::kPink;

// context
Color::kPlum;
Object y = Color::kPlum;

// context
Color::kSnow;
Object y = Color::kSnow;

// context
Color::kTeal;
Object y = Color::kTeal;

// context
Color::kRed;
Object y = Color::kRed;

// context
Color::kTan;
Object y = Color::kTan;

// context
OnboardIMU::kFlat;
Object y = OnboardIMU::kFlat;

// context
OnboardIMU::kLandscape;
Object y = OnboardIMU::kLandscape;

// context
OnboardIMU::kPortrait;
Object y = OnboardIMU::kPortrait;

// context
DriverStation::GetAlliance();
Object y = DriverStation::GetAlliance();

// context
DriverStation::GetMatchNumber();
Object y = DriverStation::GetMatchNumber();

// context
DriverStation::GetMatchType();
Object y = DriverStation::GetMatchType();

// context
DriverStation::GetEventName();
Object y = DriverStation::GetEventName();

// context
DriverStation::GetReplayNumber();
Object y = DriverStation::GetReplayNumber();

// context
DriverStation::GetLocation();
Object y = DriverStation::GetLocation();

// context
DriverStation::GetMatchTime();
Object y = DriverStation::GetMatchTime();

// context
DriverStation::GetGameSpecificMessage();
Object y = DriverStation::GetGameSpecificMessage();

// context
DriverStation::kRed;
Object y = DriverStation::kRed;

// context
DriverStation::kBlue;
Object y = DriverStation::kBlue;

// context
MatchType::None;
Object y = MatchType::None;

// context
MatchType::Practice;
Object y = MatchType::Practice;

// context
MatchType::Qualification;
Object y = MatchType::Qualification;

// context
MatchType::Elimination;
Object y = MatchType::Elimination;

// context
DriverStation::IsEnabled();
Object y = DriverStation::IsEnabled();

// context
DriverStation::IsDisabled();
Object y = DriverStation::IsDisabled();

// context
DriverStation::IsAutonomous();
Object y = DriverStation::IsAutonomous();

// context
DriverStation::IsTeleop();
Object y = DriverStation::IsTeleop();

// context
DriverStation::IsTest();
Object y = DriverStation::IsTest();

// context
DriverStation::IsAutonomousEnabled();
Object y = DriverStation::IsAutonomousEnabled();

// context
DriverStation::IsTeleopEnabled();
Object y = DriverStation::IsTeleopEnabled();

// context
DriverStation::IsTestEnabled();
Object y = DriverStation::IsTestEnabled();

// context
DriverStation::IsFMSAttached();
Object y = DriverStation::IsFMSAttached();

// context
DriverStation::IsDSAttached();
Object y = DriverStation::IsDSAttached();

// context
TestInit();
Object y = TestInit();

// context
TestPeriodic();
Object y = TestPeriodic();

// context
TestExit();
Object y = TestExit();

// context
SmartDashboard::PutNumber;
Object y = SmartDashboard::PutNumber;

// context
SmartDashboard::PutString;
Object y = SmartDashboard::PutString;

// context
SmartDashboard::PutBoolean;
Object y = SmartDashboard::PutBoolean;

// context
sysid::Direction::kForward;
Object y = sysid::Direction::kForward;

// context
sysid::Direction::kReverse;
Object y = sysid::Direction::kReverse;

// context
wpi::Encoder::k4X;
Object y = wpi::Encoder::k4X;

// context
wpi::Encoder::k2X;
Object y = wpi::Encoder::k2X;

// context
wpi::Encoder::k1X;
Object y = wpi::Encoder::k1X;
