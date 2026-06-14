export interface MapHouse {
  houseId: string;
  name: string;
}
export interface MapPackage {
  title: string;
  previewUrl: string;
  roofsHiddenPreviewUrl: string;
  houses: MapHouse[];
  initialObjects: any[];
}
export const activeMapPackage: MapPackage | null = null;
export function mapDimension(map: any, dim: string, defaultVal: number): number {
  return defaultVal;
}
export function mapRectangleStyle(house: MapHouse, mapPackage: MapPackage): string {
  return '';
}
export function roofClipStyle(house: MapHouse, mapPackage: MapPackage): string {
  return '';
}
export function mapPointStyle(x: number, y: number, w: number, h: number): string {
  return '';
}
