// generated corpus for C++ replacement idempotence. Do not modify file directly. Generate using "npm run generate-replacement-corpus"
#include "ntcore_test.h"

#include "ntcore.h"

#include "ntcore_c.h"

#include "ntcore_cpp.h"

#include "hal/UsageReporting.h"

#include "fields/fields.h"

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
wpi::math::Pose2d;
Object x = wpi::math::Pose2d;

// context
Pose2d;
Object y = Pose2d;

// context
frc::Pose3d;
Object y = frc::Pose3d;

// context
wpi::math::Pose3d;
Object x = wpi::math::Pose3d;

// context
Pose3d;
Object y = Pose3d;

// context
frc::Quaternion;
Object y = frc::Quaternion;

// context
wpi::math::Quaternion;
Object x = wpi::math::Quaternion;

// context
Quaternion;
Object y = Quaternion;

// context
frc::Rotation2d;
Object y = frc::Rotation2d;

// context
wpi::math::Rotation2d;
Object x = wpi::math::Rotation2d;

// context
Rotation2d;
Object y = Rotation2d;

// context
frc::Rotation3d;
Object y = frc::Rotation3d;

// context
wpi::math::Rotation3d;
Object x = wpi::math::Rotation3d;

// context
Rotation3d;
Object y = Rotation3d;

// context
frc::Transform2d;
Object y = frc::Transform2d;

// context
wpi::math::Transform2d;
Object x = wpi::math::Transform2d;

// context
Transform2d;
Object y = Transform2d;

// context
frc::Transform3d;
Object y = frc::Transform3d;

// context
wpi::math::Transform3d;
Object x = wpi::math::Transform3d;

// context
Transform3d;
Object y = Transform3d;

// context
frc::Translation2d;
Object y = frc::Translation2d;

// context
wpi::math::Translation2d;
Object x = wpi::math::Translation2d;

// context
Translation2d;
Object y = Translation2d;

// context
frc::Translation3d;
Object y = frc::Translation3d;

// context
wpi::math::Translation3d;
Object x = wpi::math::Translation3d;

// context
Translation3d;
Object y = Translation3d;

// context
frc::LinearSystem;
Object y = frc::LinearSystem;

// context
wpi::math::LinearSystem;
Object x = wpi::math::LinearSystem;

// context
LinearSystem;
Object y = LinearSystem;

// context
frc::LinearSystemLoop;
Object y = frc::LinearSystemLoop;

// context
wpi::math::LinearSystemLoop;
Object x = wpi::math::LinearSystemLoop;

// context
LinearSystemLoop;
Object y = LinearSystemLoop;

// context
frc::InputModulus;
Object y = frc::InputModulus;

// context
wpi::math::InputModulus;
Object x = wpi::math::InputModulus;

// context
InputModulus;
Object y = InputModulus;

// context
frc::DCMotor;
Object y = frc::DCMotor;

// context
wpi::math::DCMotor;
Object x = wpi::math::DCMotor;

// context
DCMotor;
Object y = DCMotor;

// context
frc::Matrixd;
Object y = frc::Matrixd;

// context
wpi::math::Matrixd;
Object x = wpi::math::Matrixd;

// context
Matrixd;
Object y = Matrixd;

// context
frc::Vectord;
Object y = frc::Vectord;

// context
wpi::math::Vectord;
Object x = wpi::math::Vectord;

// context
Vectord;
Object y = Vectord;

// context
frc::MakeWhiteNoiseVector;
Object y = frc::MakeWhiteNoiseVector;

// context
wpi::math::MakeWhiteNoiseVector;
Object x = wpi::math::MakeWhiteNoiseVector;

// context
MakeWhiteNoiseVector;
Object y = MakeWhiteNoiseVector;

// context
frc::DesaturateInputVector;
Object y = frc::DesaturateInputVector;

// context
wpi::math::DesaturateInputVector;
Object x = wpi::math::DesaturateInputVector;

// context
DesaturateInputVector;
Object y = DesaturateInputVector;

// context
frc::PIDController;
Object y = frc::PIDController;

// context
wpi::math::PIDController;
Object x = wpi::math::PIDController;

// context
PIDController;
Object y = PIDController;

// context
frc::ProfiledPIDController;
Object y = frc::ProfiledPIDController;

// context
wpi::math::ProfiledPIDController;
Object x = wpi::math::ProfiledPIDController;

// context
ProfiledPIDController;
Object y = ProfiledPIDController;

// context
frc::FloorMod;
Object y = frc::FloorMod;

// context
wpi::math::FloorMod;
Object x = wpi::math::FloorMod;

// context
FloorMod;
Object y = FloorMod;

// context
frc::ChassisSpeeds;
Object y = frc::ChassisSpeeds;

// context
wpi::math::ChassisSpeeds;
Object x = wpi::math::ChassisSpeeds;

// context
ChassisSpeeds;
Object y = ChassisSpeeds;

// context
frc::DifferentialDriveKinematics;
Object y = frc::DifferentialDriveKinematics;

// context
wpi::math::DifferentialDriveKinematics;
Object x = wpi::math::DifferentialDriveKinematics;

// context
DifferentialDriveKinematics;
Object y = DifferentialDriveKinematics;

// context
frc::DifferentialDriveKinematicsConstraint;
Object y = frc::DifferentialDriveKinematicsConstraint;

// context
wpi::math::DifferentialDriveKinematicsConstraint;
Object x = wpi::math::DifferentialDriveKinematicsConstraint;

// context
DifferentialDriveKinematicsConstraint;
Object y = DifferentialDriveKinematicsConstraint;

// context
frc::DifferentialDriveWheelSpeeds;
Object y = frc::DifferentialDriveWheelSpeeds;

// context
wpi::math::DifferentialDriveWheelSpeeds;
Object x = wpi::math::DifferentialDriveWheelSpeeds;

// context
DifferentialDriveWheelSpeeds;
Object y = DifferentialDriveWheelSpeeds;

// context
frc::DifferentialDriveOdometry;
Object y = frc::DifferentialDriveOdometry;

// context
wpi::math::DifferentialDriveOdometry;
Object x = wpi::math::DifferentialDriveOdometry;

// context
DifferentialDriveOdometry;
Object y = DifferentialDriveOdometry;

// context
frc::DifferentialDrivePoseEstimator;
Object y = frc::DifferentialDrivePoseEstimator;

// context
wpi::math::DifferentialDrivePoseEstimator;
Object x = wpi::math::DifferentialDrivePoseEstimator;

// context
DifferentialDrivePoseEstimator;
Object y = DifferentialDrivePoseEstimator;

// context
frc::MecanumDriveWheelPositions;
Object y = frc::MecanumDriveWheelPositions;

// context
wpi::math::MecanumDriveWheelPositions;
Object x = wpi::math::MecanumDriveWheelPositions;

// context
MecanumDriveWheelPositions;
Object y = MecanumDriveWheelPositions;

// context
frc::MecanumDriveWheelSpeeds;
Object y = frc::MecanumDriveWheelSpeeds;

// context
wpi::math::MecanumDriveWheelSpeeds;
Object x = wpi::math::MecanumDriveWheelSpeeds;

// context
MecanumDriveWheelSpeeds;
Object y = MecanumDriveWheelSpeeds;

// context
frc::MecanumDriveKinematics;
Object y = frc::MecanumDriveKinematics;

// context
wpi::math::MecanumDriveKinematics;
Object x = wpi::math::MecanumDriveKinematics;

// context
MecanumDriveKinematics;
Object y = MecanumDriveKinematics;

// context
frc::MecanumDriveOdometry;
Object y = frc::MecanumDriveOdometry;

// context
wpi::math::MecanumDriveOdometry;
Object x = wpi::math::MecanumDriveOdometry;

// context
MecanumDriveOdometry;
Object y = MecanumDriveOdometry;

// context
frc::MecanumDrivePoseEstimator;
Object y = frc::MecanumDrivePoseEstimator;

// context
wpi::math::MecanumDrivePoseEstimator;
Object x = wpi::math::MecanumDrivePoseEstimator;

// context
MecanumDrivePoseEstimator;
Object y = MecanumDrivePoseEstimator;

// context
frc::SwerveModuleState;
Object y = frc::SwerveModuleState;

// context
wpi::math::SwerveModuleState;
Object x = wpi::math::SwerveModuleState;

// context
SwerveModuleState;
Object y = SwerveModuleState;

// context
frc::SwerveModulePosition;
Object y = frc::SwerveModulePosition;

// context
wpi::math::SwerveModulePosition;
Object x = wpi::math::SwerveModulePosition;

// context
SwerveModulePosition;
Object y = SwerveModulePosition;

// context
frc::SwerveDriveKinematics;
Object y = frc::SwerveDriveKinematics;

// context
wpi::math::SwerveDriveKinematics;
Object x = wpi::math::SwerveDriveKinematics;

// context
SwerveDriveKinematics;
Object y = SwerveDriveKinematics;

// context
frc::SwerveDriveOdometry;
Object y = frc::SwerveDriveOdometry;

// context
wpi::math::SwerveDriveOdometry;
Object x = wpi::math::SwerveDriveOdometry;

// context
SwerveDriveOdometry;
Object y = SwerveDriveOdometry;

// context
frc::SwerveDrivePoseEstimator;
Object y = frc::SwerveDrivePoseEstimator;

// context
wpi::math::SwerveDrivePoseEstimator;
Object x = wpi::math::SwerveDrivePoseEstimator;

// context
SwerveDrivePoseEstimator;
Object y = SwerveDrivePoseEstimator;

// context
frc::LinearPlantInversionFeedforward;
Object y = frc::LinearPlantInversionFeedforward;

// context
wpi::math::LinearPlantInversionFeedforward;
Object x = wpi::math::LinearPlantInversionFeedforward;

// context
LinearPlantInversionFeedforward;
Object y = LinearPlantInversionFeedforward;

// context
frc::LinearQuadraticRegulator;
Object y = frc::LinearQuadraticRegulator;

// context
wpi::math::LinearQuadraticRegulator;
Object x = wpi::math::LinearQuadraticRegulator;

// context
LinearQuadraticRegulator;
Object y = LinearQuadraticRegulator;

// context
frc::SimpleMotorFeedforward;
Object y = frc::SimpleMotorFeedforward;

// context
wpi::math::SimpleMotorFeedforward;
Object x = wpi::math::SimpleMotorFeedforward;

// context
SimpleMotorFeedforward;
Object y = SimpleMotorFeedforward;

// context
frc::ElevatorFeedforward;
Object y = frc::ElevatorFeedforward;

// context
wpi::math::ElevatorFeedforward;
Object x = wpi::math::ElevatorFeedforward;

// context
ElevatorFeedforward;
Object y = ElevatorFeedforward;

// context
frc::BangBangController;
Object y = frc::BangBangController;

// context
wpi::math::BangBangController;
Object x = wpi::math::BangBangController;

// context
BangBangController;
Object y = BangBangController;

// context
frc::LTVUnicycleController;
Object y = frc::LTVUnicycleController;

// context
wpi::math::LTVUnicycleController;
Object x = wpi::math::LTVUnicycleController;

// context
LTVUnicycleController;
Object y = LTVUnicycleController;

// context
frc::Trajectory;
Object y = frc::Trajectory;

// context
wpi::math::Trajectory;
Object x = wpi::math::Trajectory;

// context
Trajectory;
Object y = Trajectory;

// context
frc::TrajectoryConfig;
Object y = frc::TrajectoryConfig;

// context
wpi::math::TrajectoryConfig;
Object x = wpi::math::TrajectoryConfig;

// context
TrajectoryConfig;
Object y = TrajectoryConfig;

// context
frc::TrajectoryGenerator;
Object y = frc::TrajectoryGenerator;

// context
wpi::math::TrajectoryGenerator;
Object x = wpi::math::TrajectoryGenerator;

// context
TrajectoryGenerator;
Object y = TrajectoryGenerator;

// context
frc::DiscretizeAB;
Object y = frc::DiscretizeAB;

// context
wpi::math::DiscretizeAB;
Object x = wpi::math::DiscretizeAB;

// context
DiscretizeAB;
Object y = DiscretizeAB;

// context
frc::RKDP;
Object y = frc::RKDP;

// context
wpi::math::RKDP;
Object x = wpi::math::RKDP;

// context
RKDP;
Object y = RKDP;

// context
frc::LinearFilter;
Object y = frc::LinearFilter;

// context
wpi::math::LinearFilter;
Object x = wpi::math::LinearFilter;

// context
LinearFilter;
Object y = LinearFilter;

// context
frc::LinearSystem;
Object y = frc::LinearSystem;

// context
wpi::math::LinearSystem;
Object x = wpi::math::LinearSystem;

// context
LinearSystem;
Object y = LinearSystem;

// context
frc::LinearSystemId;
Object y = frc::LinearSystemId;

// context
wpi::math::LinearSystemId;
Object x = wpi::math::LinearSystemId;

// context
LinearSystemId;
Object y = LinearSystemId;

// context
frc::MedianFilter;
Object y = frc::MedianFilter;

// context
wpi::math::MedianFilter;
Object x = wpi::math::MedianFilter;

// context
MedianFilter;
Object y = MedianFilter;

// context
frc::Debouncer;
Object y = frc::Debouncer;

// context
wpi::math::Debouncer;
Object x = wpi::math::Debouncer;

// context
Debouncer;
Object y = Debouncer;

// context
frc::ApplyDeadband;
Object y = frc::ApplyDeadband;

// context
wpi::math::ApplyDeadband;
Object x = wpi::math::ApplyDeadband;

// context
ApplyDeadband;
Object y = ApplyDeadband;

// context
frc::CopySignPow;
Object y = frc::CopySignPow;

// context
wpi::math::CopySignPow;
Object x = wpi::math::CopySignPow;

// context
CopySignPow;
Object y = CopySignPow;

// context
frc::CopyDirectionPow;
Object y = frc::CopyDirectionPow;

// context
wpi::math::CopyDirectionPow;
Object x = wpi::math::CopyDirectionPow;

// context
CopyDirectionPow;
Object y = CopyDirectionPow;

// context
frc::Debouncer;
Object y = frc::Debouncer;

// context
wpi::math::Debouncer;
Object x = wpi::math::Debouncer;

// context
Debouncer;
Object y = Debouncer;

// context
frc::TrapezoidProfile;
Object y = frc::TrapezoidProfile;

// context
wpi::math::TrapezoidProfile;
Object x = wpi::math::TrapezoidProfile;

// context
TrapezoidProfile;
Object y = TrapezoidProfile;

// context
frc::ExponentialProfile;
Object y = frc::ExponentialProfile;

// context
wpi::math::ExponentialProfile;
Object x = wpi::math::ExponentialProfile;

// context
ExponentialProfile;
Object y = ExponentialProfile;

// context
frc::SlewRateLimiter;
Object y = frc::SlewRateLimiter;

// context
wpi::math::SlewRateLimiter;
Object x = wpi::math::SlewRateLimiter;

// context
SlewRateLimiter;
Object y = SlewRateLimiter;

// context
frc::KalmanFilter;
Object y = frc::KalmanFilter;

// context
wpi::math::KalmanFilter;
Object x = wpi::math::KalmanFilter;

// context
KalmanFilter;
Object y = KalmanFilter;

// context
frc::Debouncer;
Object y = frc::Debouncer;

// context
wpi::math::Debouncer;
Object x = wpi::math::Debouncer;

// context
Debouncer;
Object y = Debouncer;

// context
frc::TravelingSalesman;
Object y = frc::TravelingSalesman;

// context
wpi::math::TravelingSalesman;
Object x = wpi::math::TravelingSalesman;

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
OnboardIMU::kFlat;
Object y = OnboardIMU::kFlat;

// context
OnboardIMU::kLandscape;
Object y = OnboardIMU::kLandscape;

// context
OnboardIMU::kPortrait;
Object y = OnboardIMU::kPortrait;

// context
MatchState::GetAlliance();
Object x = MatchState::GetAlliance();

// context
MatchState::GetMatchNumber();
Object x = MatchState::GetMatchNumber();

// context
MatchState::GetMatchType();
Object x = MatchState::GetMatchType();

// context
MatchState::GetEventName();
Object x = MatchState::GetEventName();

// context
MatchState::GetReplayNumber();
Object x = MatchState::GetReplayNumber();

// context
MatchState::GetLocation();
Object x = MatchState::GetLocation();

// context
MatchState::GetMatchTime();
Object x = MatchState::GetMatchTime();

// context
MatchState::GetGameData();
Object x = MatchState::GetGameData();

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
RobotState::IsEnabled();
Object x = RobotState::IsEnabled();

// context
RobotState::IsDisabled();
Object x = RobotState::IsDisabled();

// context
RobotState::IsAutonomous();
Object x = RobotState::IsAutonomous();

// context
RobotState::IsTeleop();
Object x = RobotState::IsTeleop();

// context
RobotState::IsUtility();
Object x = RobotState::IsUtility();

// context
RobotState::IsAutonomousEnabled();
Object x = RobotState::IsAutonomousEnabled();

// context
RobotState::IsTeleopEnabled();
Object x = RobotState::IsTeleopEnabled();

// context
RobotState::IsUtilityEnabled();
Object x = RobotState::IsUtilityEnabled();

// context
RobotState::IsFMSAttached();
Object x = RobotState::IsFMSAttached();

// context
RobotState::IsDSAttached();
Object x = RobotState::IsDSAttached();

// context
UtilityInit();
Object x = UtilityInit();

// context
UtilityPeriodic();
Object x = UtilityPeriodic();

// context
UtilityExit();
Object x = UtilityExit();

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
