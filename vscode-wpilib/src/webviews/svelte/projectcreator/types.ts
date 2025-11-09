export enum ProjectType {
  Example,
  Template,
}

export interface BaseOption {
  label: string;
  description: string;
}

export interface ProjectCreationData {
  base: string;
  desktop: boolean;
  projectType: ProjectType;
  language: string;
  toFolder: string;
  projectName: string;
  newFolder: boolean;
  teamNumber: string;
}

