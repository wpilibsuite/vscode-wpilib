package edu.wpi.first.tooling;

import org.gradle.tooling.ProjectConnection;

import edu.wpi.first.gradlerio.tooling.GradleRIOModel;
import edu.wpi.first.vscode.tooling.NativeModel;

public class GradleRIOServiceImpl implements GradleRIOService, AutoCloseable {

  private ProjectConnection projectConnection;
  private boolean isRunning = true;

  public GradleRIOServiceImpl(ProjectConnection projectConnection) {
    this.projectConnection = projectConnection;
  }

  public boolean getIsRunning() {
    return isRunning;
  }

  @Override
  public void exit() {
    isRunning = false;
  }

  @Override
  public void close() {
    if (projectConnection != null) {
      projectConnection.close();
    }
  }

  @Override
  public GradleRIOModel getGradleRIOInfo() {
    return projectConnection.getModel(GradleRIOModel.class);
  }

  @Override
  public NativeModel getVsCodeNativeModel() {
    return projectConnection.getModel(NativeModel.class);
}
}
