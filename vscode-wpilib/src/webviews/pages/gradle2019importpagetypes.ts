'use strict';

export interface IGradle2019IPCData {
  desktop: boolean;
  fromProps: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

export interface IGradle2019IPCReceive {
  type: string;
  data?: IGradle2019IPCData;
}

export interface IGradle2019IPCSend {
  type: string;
  data: string;
}
