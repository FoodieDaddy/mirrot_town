export class RoofVisibilityState {
  getState() { return { mode: 'NORMAL', hiddenHouseIds: new Set<string>() }; }
  isRoofHidden(houseId: string) { return false; }
}
export const roofVisibility = new RoofVisibilityState();
