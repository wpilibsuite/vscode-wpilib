package edu.wpi.first.tooling;

import edu.wpi.first.gradlerio.tooling.GradleRIOModel;
import edu.wpi.first.vscode.tooling.NativeModel;

public interface GradleRIOService {
  void exit();
  GradleRIOModel getGradleRIOInfo();
  NativeModel getVsCodeNativeModel();
}
