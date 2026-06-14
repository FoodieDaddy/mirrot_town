import { describe, it, expect, beforeEach } from 'vitest';
import { NeedsSystem } from './NeedsSystem.js';
import { BehaviorTreeRunner } from './BehaviorTreeRunner.js';
import type { BTContext } from './types.js';

function makeContext(overrides: Partial<BTContext> = {}): BTContext {
  return {
    characterId: 'npc1',
    currentTick: 100,
    hasItem: () => false,
    hasMoney: () => false,
    getNearbyObjects: () => [],
    getNearbyCharacters: () => [],
    getCurrentAction: () => undefined,
    ...overrides,
  };
}

describe('BehaviorTreeRunner', () => {
  let needsSystem: NeedsSystem;
  let runner: BehaviorTreeRunner;

  beforeEach(() => {
    needsSystem = new NeedsSystem();
    runner = new BehaviorTreeRunner(needsSystem);
  });

  it('should select critical thirst action when very thirsty', () => {
    needsSystem.initCharacter('npc1', { thirst: 10 });
    const context = makeContext({
      getNearbyObjects: (tag) => tag === 'water_source' ? ['well1'] : [],
    });

    const result = runner.selectAction('npc1', context);
    expect(result.actionCode).toBe('fetch_water');
    expect(result.targetId).toBe('well1');
  });

  it('should select critical hunger action when very hungry', () => {
    needsSystem.initCharacter('npc1', { hunger: 10 });
    const context = makeContext({
      getNearbyObjects: (tag) => tag === 'shop' ? ['shop1'] : [],
    });

    const result = runner.selectAction('npc1', context);
    expect(result.actionCode).toBe('buy_item');
  });

  it('should eat if has food when hungry', () => {
    needsSystem.initCharacter('npc1', { hunger: 10 });
    const context = makeContext({
      hasItem: (item) => item === 'food',
    });

    const result = runner.selectAction('npc1', context);
    expect(result.actionCode).toBe('eat');
  });

  it('should sleep when exhausted', () => {
    needsSystem.initCharacter('npc1', { energy: 10 });
    const context = makeContext({
      getNearbyObjects: (tag) => tag === 'bed' ? ['bed1'] : [],
    });

    const result = runner.selectAction('npc1', context);
    expect(result.actionCode).toBe('sleep');
  });

  it('should work when money pressure is high', () => {
    needsSystem.initCharacter('npc1', { moneyPressure: 80 });
    const context = makeContext({
      getNearbyObjects: (tag) => tag === 'workplace' ? ['workshop1'] : [],
    });

    const result = runner.selectAction('npc1', context);
    expect(result.actionCode).toBe('work_task');
  });

  it('should socialize when lonely', () => {
    needsSystem.initCharacter('npc1', { social: 20 });
    const context = makeContext({
      getNearbyCharacters: () => ['npc2'],
    });

    const result = runner.selectAction('npc1', context);
    expect(result.actionCode).toBe('talk');
    expect(result.targetId).toBe('npc2');
  });

  it('should return wait as fallback', () => {
    needsSystem.initCharacter('npc1', {
      hunger: 80,
      thirst: 80,
      energy: 80,
      social: 80,
      moneyPressure: 10,
    });

    const result = runner.selectAction('npc1', makeContext());
    // Should be one of the idle actions
    expect(['move_to', 'wait', 'observe']).toContain(result.actionCode);
  });

  it('should handle missing character gracefully', () => {
    const result = runner.selectAction('unknown', makeContext());
    expect(result.actionCode).toBe('wait');
  });
});
