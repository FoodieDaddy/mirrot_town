/**
 * WorldCommandAdapter
 * Generates WorldCommands from user interactions (clicking buildings/NPCs, etc.)
 * For now, commands are logged to console. In future, they'll be sent to the server.
 */
import type { WorldCommand, Vec3 } from '@jingzhong-biancheng/shared';

export class WorldCommandAdapter {
  private onCommand: ((command: WorldCommand) => void) | null = null;

  setCommandHandler(handler: (command: WorldCommand) => void): void {
    this.onCommand = handler;
  }

  /**
   * Player wants to move to a target position.
   */
  movePlayer(target: Vec3): void {
    this.emit({ type: 'move_player', target });
  }

  /**
   * Player selected a building.
   */
  selectBuilding(buildingId: string): void {
    this.emit({ type: 'select_building', buildingId });
  }

  /**
   * Player wants to toggle roof mode on a building.
   */
  setRoofMode(buildingId: string, roofMode: 'normal' | 'hidden'): void {
    this.emit({ type: 'set_roof_mode', buildingId, roofMode });
  }

  /**
   * Player wants to interact with an entity.
   */
  interact(entityId: string, interactionType: string): void {
    this.emit({ type: 'interact', entityId, interactionType });
  }

  private emit(command: WorldCommand): void {
    console.log('[WorldCommand]', command);
    this.onCommand?.(command);
  }
}
