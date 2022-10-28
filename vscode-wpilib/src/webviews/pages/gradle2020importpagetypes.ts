'use strict';

export interface IGradle2020IPCData {
  desktop: boolean;
  romi: boolean;
  fromProps: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

export interface IGradle2020IPCReceive {
  type: string;
  data?: IGradle2020IPCData;
}

export interface IGradle2020IPCSend {
  type: string;
  data: string;
}
