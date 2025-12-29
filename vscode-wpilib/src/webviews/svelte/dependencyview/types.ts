export interface InstalledDependency {
  name: string;
  currentVersion: string;
  versionInfo: { version: string; buttonText: string }[];
}

export interface AvailableDependency {
  name: string;
  version: string;
  description: string;
  website: string;
  instructions?: string;
}
