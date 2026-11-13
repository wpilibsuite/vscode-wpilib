'use strict';

export const ComponentPackages = {
  APRILTAG: 'apriltag',
  COMMANDSV2: 'commands2',
  CSCORE: 'cscore',
  ROMI: 'romi',
  SIM: 'sim',
  XRP: 'xrp',
};

export const allComponents = ['all', 'apriltag', 'commands2', 'cscore', 'romi', 'sim', 'xrp'];

export function isComponent(pkg: string): boolean {
  return allComponents.includes(pkg);
}

export function componentForVendorDep(vendorDep: string): string | undefined {
  switch (vendorDep) {
    case 'commandsv2':
      return ComponentPackages.COMMANDSV2;
    case 'apriltag':
      return ComponentPackages.APRILTAG;
    case 'cscore':
      return ComponentPackages.CSCORE;
    case 'romi':
      return ComponentPackages.ROMI;
    case 'sim':
      return ComponentPackages.SIM;
    case 'xrp':
      return ComponentPackages.XRP;
    default:
      return undefined;
  }
}
