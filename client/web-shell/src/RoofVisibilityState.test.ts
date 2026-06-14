import { describe, expect, it } from 'vitest';

import { RoofVisibilityState } from './RoofVisibilityState.js';

describe('RoofVisibilityState', () => {
  it('shows every roof by default and toggles a single house', () => {
    const roofs = new RoofVisibilityState();

    expect(roofs.isRoofHidden('house_a')).toBe(false);

    roofs.toggleHouse('house_a');
    expect(roofs.isRoofHidden('house_a')).toBe(true);
    expect(roofs.isRoofHidden('house_b')).toBe(false);

    roofs.toggleHouse('house_a');
    expect(roofs.isRoofHidden('house_a')).toBe(false);
  });

  it('ignores single-house clicks while all roofs are hidden', () => {
    const roofs = new RoofVisibilityState();

    roofs.hideAll();
    roofs.toggleHouse('house_a');

    expect(roofs.getState().mode).toBe('ALL_HIDDEN');
    expect(roofs.isRoofHidden('house_a')).toBe(true);
  });

  it('showAll restores every roof and clears individual overrides', () => {
    const roofs = new RoofVisibilityState();

    roofs.toggleHouse('house_a');
    roofs.hideAll();
    roofs.showAll();

    expect(roofs.getState().mode).toBe('NORMAL');
    expect(roofs.getState().hiddenHouseIds.size).toBe(0);
    expect(roofs.isRoofHidden('house_a')).toBe(false);
  });
});
