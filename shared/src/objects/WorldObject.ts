import type { Transform } from '../map/Transform.js';

export interface WorldObject {
  objectId: string;
  templateId: string;
  regionId: string;
  transform: Transform;
  state: Readonly<Record<string, unknown>>;
  enabled?: boolean;
}
