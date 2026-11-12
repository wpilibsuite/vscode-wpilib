'use strict';

export enum ProjectType {
  Example,
  Template,
}

export interface IBaseOption {
  label: string;
  description: string;
  tags: string[];
}

export interface ISnippetOption {
  name: string;
  description: string;
  tags: string[];
}

export interface IProjectIPCData {
  base: string;
  desktop: boolean;
  projectType: ProjectType;
  language: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

export interface IProjectIPCReceive {
  type: string;
  data?: IProjectIPCData;
  requestId?: number;
}

export interface IProjectIPCSend {
  type: string;
  data: string | boolean | ProjectType | string[] | IBaseOption[] | ISnippetOption[];
  requestId?: number;
}
