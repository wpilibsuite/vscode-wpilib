'use strict';

export interface IGradle2025IPCData {
  desktop: boolean;
  romi: boolean;
  xrp: boolean;
  fromProps: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

export interface IGradle2025IPCReceive {
  type: string;
  data?: IGradle2025IPCData;
}

export interface IGradle2025IPCSend {
  type: string;
  data: string;
}
