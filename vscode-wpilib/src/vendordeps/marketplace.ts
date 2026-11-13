'use strict';

export const vendordepMarketplaceURL =
  'https://frcmaven.wpi.edu/artifactory/vendordeps/vendordep-marketplace/';

export interface IJsonList {
  path: string;
  name: string;
  version: string;
  uuid: string;
  description: string;
  website: string;
  python?: string;
  instructions?: string;
}

function isJsonList(jsonDepList: IJsonList[]): jsonDepList is IJsonList[] {
  return jsonDepList.every(
    (jsonDep) =>
      jsonDep.path !== undefined &&
      jsonDep.name !== undefined &&
      jsonDep.uuid !== undefined &&
      jsonDep.version !== undefined &&
      jsonDep.description !== undefined &&
      jsonDep.website !== undefined
  );
}

export async function loadManifest(projectYear: string): Promise<IJsonList[]> {
  const url = `${vendordepMarketplaceURL}${projectYear}.json`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error('Bad status ' + response.status);
  }
  const json = (await response.json()) as IJsonList[];
  if (!isJsonList(json)) {
    throw new Error('Incorrect JSON format');
  }
  return json;
}
