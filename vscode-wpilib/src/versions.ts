'use strict';

interface IVersion {
  major: number;
  minor: number;
  patch: number;
  else: string | undefined;
  version: string;
}

/** Converts a version string to its corresponding Version object. */
function parseVersion(version?: string): IVersion | undefined {
  if (version === undefined) {
    return undefined;
  }

  const dashIndex = version.indexOf('-');
  const dashParts: string[] = [];
  if (dashIndex >= 0) {
    // has a dash.
    dashParts.push(version.substring(0, dashIndex));
    dashParts.push(version.substring(dashIndex + 1));
  } else {
    dashParts.push(version);
  }
  // const dashParts: string[] = version.split('-', 2);
  const parts: string[] = version.split('.');

  return {
    else: dashParts.length === 2 ? dashParts[1] : undefined,
    major: parseInt(parts[0], 10),
    minor: parts.length > 1 ? parseInt(parts[1], 10) : 0,
    patch: parts.length > 2 ? parseInt(parts[2], 10) : 0,
    version,
  };
}

/** Checks to see if version1 is newer than version2. */
function isNewerVersion(version1: IVersion | string, version2: IVersion | string): boolean {
  if (typeof version1 === 'string') {
    version1 = parseVersion(version1 as string) as IVersion;
  }

  if (typeof version2 === 'string') {
    version2 = parseVersion(version2 as string) as IVersion;
  }

  if (version1.version === version2.version) {
    return false;
  }

  if (version1.major > version2.major) {
    return true;
  } else if (version1.major < version2.major) {
    return false;
  }

  if (version1.minor > version2.minor) {
    return true;
  } else if (version1.minor < version2.minor) {
    return false;
  }

  if (version1.patch > version2.patch) {
    return true;
  } else if (version1.patch < version2.patch) {
    return false;
  }

  // At this point, major, minor and patch are equal.
  // If a has no extra data, it is greater.
  // If b has no extra data, it is not greater

  if (version1.else === undefined) {
    return true;
  } else if (version2.else === undefined) {
    return false;
  }

  // If both have extra data, go alphanumeric
  return version1.else > version2.else;
}

export function versionGreaterThen(a: string, b: string): boolean {
  return isNewerVersion(a, b);
}
