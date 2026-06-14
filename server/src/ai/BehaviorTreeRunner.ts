/**
 * BehaviorTreeRunner — evaluates NPC needs and selects actions.
 *
 * Priority order:
 * 1. Critical needs (hunger/thirst < 20) → eat/drink
 * 2. Low energy (< 20) → sleep
 * 3. Work tasks → accept/complete work
 * 4. Farming/horse care → tend to crops/animals
 * 5. Home improvement → place objects, plant flowers
 * 6. Social → talk to other NPCs
 * 7. Idle → wander, observe, rest
 *
 * Design doc: docs/design/07_ai_agent_goal_memory_system.md
 */

import type { NeedsSystem } from './NeedsSystem.js';
import type { CharacterNeeds, BTContext, BTResult } from './types.js';

interface BehaviorRule {
  name: string;
  priority: number; // higher = checked first
  condition: (needs: CharacterNeeds, context: BTContext) => boolean;
  selectAction: (needs: CharacterNeeds, context: BTContext) => BTResult;
}

export class BehaviorTreeRunner {
  private readonly needsSystem: NeedsSystem;
  private readonly rules: BehaviorRule[];

  constructor(needsSystem: NeedsSystem) {
    this.needsSystem = needsSystem;
    this.rules = this.buildRules();
  }

  private buildRules(): BehaviorRule[] {
    return [
      // ─── Critical Needs ─────────────────────────────
      {
        name: 'critical_thirst',
        priority: 100,
        condition: (needs) => needs.thirst < 20,
        selectAction: (_needs, context) => {
          const waterSources = context.getNearbyObjects('water_source');
          if (waterSources.length > 0) {
            return {
              actionCode: 'fetch_water',
              targetId: waterSources[0],
              reason: '非常渴，需要喝水',
            };
          }
          const shops = context.getNearbyObjects('shop');
          if (shops.length > 0) {
            return {
              actionCode: 'buy_item',
              targetId: shops[0],
              reason: '非常渴，去买水',
            };
          }
          return { actionCode: null, reason: '找不到水源' };
        },
      },
      {
        name: 'critical_hunger',
        priority: 99,
        condition: (needs) => needs.hunger < 20,
        selectAction: (_needs, context) => {
          if (context.hasItem('food')) {
            return { actionCode: 'eat', reason: '非常饿，吃食物' };
          }
          const shops = context.getNearbyObjects('shop');
          if (shops.length > 0) {
            return {
              actionCode: 'buy_item',
              targetId: shops[0],
              reason: '非常饿，去商店买食物',
            };
          }
          return { actionCode: null, reason: '找不到食物' };
        },
      },
      {
        name: 'critical_energy',
        priority: 98,
        condition: (needs) => needs.energy < 15,
        selectAction: (_needs, context) => {
          const beds = context.getNearbyObjects('bed');
          return {
            actionCode: 'sleep',
            targetId: beds[0],
            reason: '筋疲力尽，需要睡觉',
          };
        },
      },

      // ─── High Priority Needs ────────────────────────
      {
        name: 'low_energy',
        priority: 80,
        condition: (needs) => needs.energy < 35,
        selectAction: (_needs, context) => {
          const beds = context.getNearbyObjects('bed');
          if (beds.length > 0) {
            return { actionCode: 'sleep', targetId: beds[0], reason: '有些困了，去睡觉' };
          }
          const seats = context.getNearbyObjects('seat');
          return { actionCode: 'sit', targetId: seats[0], reason: '有些累，坐下休息' };
        },
      },
      {
        name: 'low_thirst',
        priority: 75,
        condition: (needs) => needs.thirst < 40,
        selectAction: (_needs, context) => {
          const waterSources = context.getNearbyObjects('water_source');
          return {
            actionCode: 'fetch_water',
            targetId: waterSources[0],
            reason: '口渴了，去取水',
          };
        },
      },
      {
        name: 'low_hunger',
        priority: 74,
        condition: (needs) => needs.hunger < 40,
        selectAction: (_needs, context) => {
          if (context.hasItem('food')) {
            return { actionCode: 'eat', reason: '饿了，吃点东西' };
          }
          const shops = context.getNearbyObjects('shop');
          return {
            actionCode: 'buy_item',
            targetId: shops[0],
            reason: '饿了，去买食物',
          };
        },
      },

      // ─── Work ───────────────────────────────────────
      {
        name: 'do_work',
        priority: 60,
        condition: (needs) => needs.moneyPressure > 50,
        selectAction: (_needs, context) => {
          const workplaces = context.getNearbyObjects('workplace');
          if (workplaces.length > 0) {
            return {
              actionCode: 'work_task',
              targetId: workplaces[0],
              reason: '需要钱，去工作',
            };
          }
          const fishingSpots = context.getNearbyObjects('fishing_spot');
          if (fishingSpots.length > 0 && context.hasItem('fishing_rod')) {
            return {
              actionCode: 'fish',
              targetId: fishingSpots[0],
              reason: '去钓鱼赚点钱',
            };
          }
          return { actionCode: null, reason: '找不到工作' };
        },
      },

      // ─── Farming ────────────────────────────────────
      {
        name: 'tend_farm',
        priority: 50,
        condition: () => true, // always available
        selectAction: (_needs, context) => {
          const farmPlots = context.getNearbyObjects('farm_plot');
          if (farmPlots.length === 0) return { actionCode: null, reason: '没有农田' };

          const plot = farmPlots[0];
          return {
            actionCode: 'water_crop',
            targetId: plot,
            reason: '去农田浇水',
          };
        },
      },

      // ─── Horse Care ─────────────────────────────────
      {
        name: 'care_horse',
        priority: 45,
        condition: () => true,
        selectAction: (_needs, context) => {
          const stables = context.getNearbyObjects('stable');
          if (stables.length === 0) return { actionCode: null, reason: '没有马厩' };

          const stable = stables[0];
          const actions = ['feed_horse', 'water_horse', 'brush_horse'];
          const action = actions[Math.floor(Math.random() * actions.length)];

          return {
            actionCode: action ?? null,
            targetId: stable,
            reason: '去照顾马',
          };
        },
      },

      // ─── Home Improvement ───────────────────────────
      {
        name: 'improve_home',
        priority: 40,
        condition: (needs) => needs.comfort < 50,
        selectAction: (_needs, context) => {
          const flowers = context.getNearbyObjects('flower_pot');
          if (flowers.length > 0) {
            return { actionCode: 'water_flower', targetId: flowers[0], reason: '去浇花' };
          }
          return { actionCode: 'clean_home', reason: '打扫一下家' };
        },
      },

      // ─── Social ─────────────────────────────────────
      {
        name: 'socialize',
        priority: 30,
        condition: (needs) => needs.social < 40,
        selectAction: (_needs, context) => {
          const characters = context.getNearbyCharacters();
          if (characters.length > 0) {
            const target = characters[Math.floor(Math.random() * characters.length)];
            return {
              actionCode: 'talk',
              targetId: target,
              reason: '想找人聊聊天',
            };
          }
          return { actionCode: null, reason: '附近没人' };
        },
      },

      // ─── Leisure ────────────────────────────────────
      {
        name: 'go_fishing',
        priority: 20,
        condition: () => Math.random() < 0.3, // 30% chance
        selectAction: (_needs, context) => {
          const fishingSpots = context.getNearbyObjects('fishing_spot');
          if (fishingSpots.length > 0) {
            return {
              actionCode: 'fish',
              targetId: fishingSpots[0],
              reason: '想去钓鱼放松一下',
            };
          }
          return { actionCode: null, reason: '附近没有钓鱼点' };
        },
      },

      // ─── Idle ───────────────────────────────────────
      {
        name: 'idle_wander',
        priority: 10,
        condition: () => true,
        selectAction: () => {
          const actions = ['move_to', 'wait', 'observe'];
          const action = actions[Math.floor(Math.random() * actions.length)];
          return {
            actionCode: action ?? null,
            reason: '闲逛',
          };
        },
      },
    ];
  }

  /**
   * Evaluate needs and select an action for an NPC.
   */
  selectAction(characterId: string, context: BTContext): BTResult {
    const needs = this.needsSystem.get(characterId);
    if (!needs) {
      return { actionCode: 'wait', reason: '无需求数据，原地等待' };
    }

    // Sort rules by priority (highest first)
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.condition(needs, context)) {
        const result = rule.selectAction(needs, context);
        if (result.actionCode) {
          return result;
        }
      }
    }

    return { actionCode: 'wait', reason: '无事可做' };
  }
}
