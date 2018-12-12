'use strict';

export interface IEclipseIPCData {
  desktop: boolean;
  fromProps: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

export interface IEclipseIPCReceive {
  type: string;
  data?: IEclipseIPCData;
}

export interface IEclipseIPCSend {
  type: string;
  data: string;
}
