/**
 * NeedsSystem — manages character needs (hunger, thirst, energy, etc.)
 *
 * Needs decay over time and are restored by actions.
 * The behavior tree uses needs to determine what actions to take.
 */

import type { CharacterNeeds } from './types.js';

export interface NeedsDecayConfig {
  hungerDecayPerTick: number;
  thirstDecayPerTick: number;
  energyDecayPerTick: number;
  cleanlinessDecayPerTick: number;
  socialDecayPerTick: number;
  comfortDecayPerTick: number;
}

const DEFAULT_DECAY: NeedsDecayConfig = {
  hungerDecayPerTick: 0.02,
  thirstDecayPerTick: 0.03,
  energyDecayPerTick: 0.015,
  cleanlinessDecayPerTick: 0.005,
  socialDecayPerTick: 0.01,
  comfortDecayPerTick: 0.005,
};

export class NeedsSystem {
  private readonly needs = new Map<string, CharacterNeeds>();
  private readonly decayConfig: NeedsDecayConfig;

  constructor(decayConfig: NeedsDecayConfig = DEFAULT_DECAY) {
    this.decayConfig = decayConfig;
  }

  /**
   * Initialize needs for a character.
   */
  initCharacter(characterId: string, initial?: Partial<Omit<CharacterNeeds, 'characterId' | 'updatedAt'>>): void {
    this.needs.set(characterId, {
      characterId,
      hunger: initial?.hunger ?? 80,
      thirst: initial?.thirst ?? 80,
      energy: initial?.energy ?? 80,
      cleanliness: initial?.cleanliness ?? 80,
      social: initial?.social ?? 60,
      comfort: initial?.comfort ?? 60,
      moneyPressure: initial?.moneyPressure ?? 20,
      safety: initial?.safety ?? 80,
      updatedAt: Date.now(),
    });
  }

  /**
   * Get needs for a character.
   */
  get(characterId: string): CharacterNeeds | undefined {
    return this.needs.get(characterId);
  }

  /**
   * Decay all needs by one tick.
   */
  decayAll(): void {
    for (const [id, needs] of this.needs) {
      needs.hunger = Math.max(0, needs.hunger - this.decayConfig.hungerDecayPerTick);
      needs.thirst = Math.max(0, needs.thirst - this.decayConfig.thirstDecayPerTick);
      needs.energy = Math.max(0, needs.energy - this.decayConfig.energyDecayPerTick);
      needs.cleanliness = Math.max(0, needs.cleanliness - this.decayConfig.cleanlinessDecayPerTick);
      needs.social = Math.max(0, needs.social - this.decayConfig.socialDecayPerTick);
      needs.comfort = Math.max(0, needs.comfort - this.decayConfig.comfortDecayPerTick);
      needs.updatedAt = Date.now();
    }
  }

  /**
   * Apply need changes (from action effects).
   */
  applyChange(characterId: string, changes: Partial<Record<keyof Omit<CharacterNeeds, 'characterId' | 'updatedAt'>, number>>): void {
    const needs = this.needs.get(characterId);
    if (!needs) return;

    for (const [key, delta] of Object.entries(changes)) {
      const k = key as keyof typeof needs;
      if (typeof needs[k] === 'number') {
        (needs as any)[k] = Math.max(0, Math.min(100, (needs[k] as number) + (delta as number)));
      }
    }
    needs.updatedAt = Date.now();
  }

  /**
   * Get the most urgent need for a character.
   */
  getMostUrgentNeed(characterId: string): { need: string; value: number } | undefined {
    const needs = this.needs.get(characterId);
    if (!needs) return undefined;

    const needValues: Array<{ need: string; value: number }> = [
      { need: 'hunger', value: needs.hunger },
      { need: 'thirst', value: needs.thirst },
      { need: 'energy', value: needs.energy },
      { need: 'cleanliness', value: needs.cleanliness },
      { need: 'social', value: needs.social },
      { need: 'comfort', value: needs.comfort },
      { need: 'moneyPressure', value: 100 - needs.moneyPressure }, // invert: high pressure = low value
      { need: 'safety', value: needs.safety },
    ];

    // Sort by lowest value (most urgent)
    needValues.sort((a, b) => a.value - b.value);
    return needValues[0];
  }

  /**
   * Apply action effects to needs (from completed actions).
   */
  applyActionEffects(characterId: string, actionCode: string): void {
    const needs = this.needs.get(characterId);
    if (!needs) return;

    const effects: Partial<Record<keyof Omit<CharacterNeeds, 'characterId' | 'updatedAt'>, number>> = {};

    switch (actionCode) {
      case 'eat':
        effects.hunger = -50;
        break;
      case 'fetch_water':
        effects.thirst = -60;
        break;
      case 'sleep':
        effects.energy = -80;
        break;
      case 'talk':
        effects.social = -30;
        break;
      case 'fish':
        effects.social = -10;
        break;
      case 'feed_horse':
      case 'water_crop':
        effects.moneyPressure = -20;
        break;
      case 'buy_item':
        effects.moneyPressure = -10;
        break;
    }

    if (Object.keys(effects).length > 0) {
      this.applyChange(characterId, effects);
    }
  }

  /**
   * Update money pressure based on balance.
   */
  updateMoneyPressure(characterId: string, balance: number): void {
    const needs = this.needs.get(characterId);
    if (!needs) return;

    // 余额越高，金钱压力越低
    // 余额 0 → 压力 100
    // 余额 50 → 压力 50
    // 余额 100+ → 压力 0
    needs.moneyPressure = Math.max(0, Math.min(100, 100 - balance));
    needs.updatedAt = Date.now();
  }

  /**
   * Get all character IDs being tracked.
   */
  getAllCharacterIds(): string[] {
    return [...this.needs.keys()];
  }

  /**
   * Get count of tracked characters.
   */
  get characterCount(): number {
    return this.needs.size;
  }
}
