import { describe, expect, it } from 'vitest';

import { buildMapPackage } from './MapPackage.js';

describe('buildMapPackage', () => {
  it('joins map dimensions, house names, click areas, and initial objects', () => {
    const map = buildMapPackage(
      {
        id: 'map_a',
        version: '1.0.0',
        title: '地图 A',
        packagePath: 'map_a',
        worldSeed: 'compiled/world_seed.json',
        preview: 'preview/map.png',
        roofsHiddenPreview: 'preview/hidden.png',
      },
      {
        map_id: 'map_a',
        title: '地图 A',
        tile_size: 32,
        size: { width: 128, height: 96 },
      },
      [
        {
          house_id: 'house_a',
          roof_group_id: 'roof_a',
          x: 10,
          y: 20,
          w: 12,
          h: 8,
        },
      ],
      [{ id: 'house_a', name: '林家' }],
      [
        {
          id: 'bed_a',
          template_id: 'simple_bed',
          region_id: 'house_a',
          position: { x: 12, y: 23 },
          state: { condition: 90 },
        },
      ]
    );

    expect(map).toMatchObject({
      id: 'map_a',
      width: 128,
      height: 96,
      tileSize: 32,
      houses: [
        {
          houseId: 'house_a',
          roofGroupId: 'roof_a',
          name: '林家',
          x: 10,
          y: 20,
          width: 12,
          height: 8,
        },
      ],
      initialObjects: [
        {
          objectId: 'bed_a',
          templateId: 'simple_bed',
          regionId: 'house_a',
          transform: { x: 12, y: 23 },
        },
      ],
    });
  });

  it('rejects a manifest and world-seed id mismatch', () => {
    expect(() =>
      buildMapPackage(
        {
          id: 'map_a',
          version: '1.0.0',
          title: '地图 A',
          packagePath: 'map_a',
          worldSeed: 'compiled/world_seed.json',
          preview: 'preview/map.png',
          roofsHiddenPreview: 'preview/hidden.png',
        },
        {
          map_id: 'map_b',
          title: '地图 B',
          tile_size: 32,
          size: { width: 1, height: 1 },
        },
        [],
        [],
        []
      )
    ).toThrow('does not match');
  });
});
