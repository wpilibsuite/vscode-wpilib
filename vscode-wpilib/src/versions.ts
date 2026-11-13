'use strict';

interface IVersion {
  major: number;
  minor: number;
  patch: number;
  else?: string;
  version: string;
}

/** Converts a version string to its corresponding Version object. */
function parseVersion(v: string): IVersion {
  // Get the version number without the (prerelease) if it's added
  const preIndex = v.indexOf(' (prerelease)');
  let version = v;
  if (preIndex >= 0) {
    version = version.substring(0, preIndex);
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
    minor: parts.length > 1 ? parseInt(parts[1], 10) : -1,
    patch: parts.length > 2 ? parseInt(parts[2], 10) : -1,
    version,
  };
}

/** Checks to see if version1 is newer than version2. */
export function isNewerVersion(version1: IVersion | string, version2: IVersion | string): boolean {
  if (typeof version1 === 'string') {
    version1 = parseVersion(version1);
  }

  if (typeof version2 === 'string') {
    version2 = parseVersion(version2);
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

  // If both have extra data, check for pre,
  // then go alphanumeric
  const version1Pre = version1.else.indexOf('pre') >= 0;
  const version2Pre = version2.else.indexOf('pre') >= 0;

  if (version1Pre && version2Pre) {
    // Both pre, return greatest
    return version1.else > version2.else;
  } else if (version1Pre) {
    // False if 1 has pre
    return false;
  } else if (version2Pre) {
    // True is 2 has pre
    return true;
  } else {
    // Neither has pre, return greatest.
    return version1.else > version2.else;
  }
}

interface IPep440Version {
  epoch: number;
  release: number[];
  pre: [number, number];
  post: number;
  dev: number;
}

const pep440Regex =
  /^v?(?:(\d+)!)?(\d+(?:\.\d+)*)(?:[-_.]?(a|alpha|b|beta|c|rc|pre|preview)[-_.]?(\d*))?(?:-(\d+)|[-_.]?(?:post|rev|r)[-_.]?(\d*))?(?:[-_.]?dev[-_.]?(\d*))?(?:\+[a-z0-9.]*)?$/;

function parsePep440(v: string): IPep440Version | undefined {
  const preIndex = v.indexOf(' (prerelease)');
  const version = (preIndex >= 0 ? v.substring(0, preIndex) : v).trim().toLowerCase();
  const m = pep440Regex.exec(version);
  if (!m) {
    return undefined;
  }
  const num = (s: string | undefined) => (s ? parseInt(s, 10) : 0);
  const preLabel = m[3];
  let prePhase = 3;
  if (preLabel) {
    if (preLabel.startsWith('a')) {
      prePhase = 0;
    } else if (preLabel.startsWith('b')) {
      prePhase = 1;
    } else {
      prePhase = 2;
    }
  }
  const hasPost = m[5] !== undefined || m[6] !== undefined;
  const hasDev = m[7] !== undefined;
  if (!preLabel && !hasPost && hasDev) {
    prePhase = -1;
  }
  return {
    epoch: num(m[1]),
    release: m[2].split('.').map((x) => parseInt(x, 10)),
    pre: [prePhase, num(m[4])],
    post: hasPost ? num(m[5] ?? m[6]) : -1,
    dev: hasDev ? num(m[7]) : Infinity,
  };
}

function comparePep440(a: IPep440Version, b: IPep440Version): number {
  if (a.epoch !== b.epoch) {
    return a.epoch - b.epoch;
  }
  const len = Math.max(a.release.length, b.release.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.release[i] ?? 0) - (b.release[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  const keysA = [a.pre[0], a.pre[1], a.post, a.dev];
  const keysB = [b.pre[0], b.pre[1], b.post, b.dev];
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) {
      return keysA[i] < keysB[i] ? -1 : 1;
    }
  }
  return 0;
}

export function isNewerPythonVersion(version1: string, version2: string): boolean {
  const a = parsePep440(version1);
  const b = parsePep440(version2);
  if (!a || !b) {
    return isNewerVersion(version1, version2);
  }
  return comparePep440(a, b) > 0;
}
