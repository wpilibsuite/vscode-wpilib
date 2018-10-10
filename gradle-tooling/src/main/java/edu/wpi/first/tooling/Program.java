package edu.wpi.first.tooling;

import java.io.File;
import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.googlecode.jsonrpc4j.JsonRpcServer;

import org.gradle.tooling.GradleConnector;
import org.gradle.tooling.ProjectConnection;

public class Program {
  public static void main(String[] args) throws IOException {

    GradleConnector connector = GradleConnector.newConnector();
    // {"method":"getGradleRIOInfo", "jsonrpc": "2.0", "id": "1234"}

    File file = new File("C:\\Users\\thadh\\Documents\\GreatMindsSkybase");

    connector.forProjectDirectory(file);

    ProjectConnection connection = null;

    try {
      connection = connector.connect();
    } catch (Exception ex) {
      System.out.println(ex);
      System.exit(1);
      return;
    }

    try (GradleRIOServiceImpl grService = new GradleRIOServiceImpl(connection)) {
      JsonRpcServer rpcServer = new JsonRpcServer(new ObjectMapper(), grService, GradleRIOService.class);
      while (grService.getIsRunning()) {
        rpcServer.handleRequest(System.in, System.out);
      }
    }
  }
}
