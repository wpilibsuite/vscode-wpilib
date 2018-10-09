package edu.wpi.first.tooling;

import java.io.File;

import org.gradle.tooling.GradleConnector;
import org.gradle.tooling.ProjectConnection;
import org.gradle.tooling.BuildActionExecuter.Builder;

import edu.wpi.first.gradlerio.tooling.GradleRIOModel;

public class Program {
  public static void main(String[] args) {
    GradleConnector connector = GradleConnector.newConnector();

    File file = new File("C:\\Users\\thadh\\Documents\\GreatMindsSkybase");

    connector.forProjectDirectory(file);

    ProjectConnection connection = connector.connect();

    try {
      Builder builder = connection.action();

      {
        GradleRIOModel natives = connection.getModel(GradleRIOModel.class);
        String tc = natives.getCppConfigurations();
        String tc2 = natives.getTools();
        System.out.println(tc);
        System.out.println(tc2);
      }
    } finally {
      connection.close();
    }
  }
}
