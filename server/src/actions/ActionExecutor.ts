/**
 * ActionExecutor — executes actions for NPCs, managing phase progression.
 *
 * Each action has phases that execute sequentially. The executor tracks
 * which phase each NPC is on and advances them based on tick timing.
 *
 * Design doc: docs/design/06_action_event_animation_system.md
 */

import type { NpcState } from '@jingzhong-biancheng/shared';
import type { ActionRegistry } from './ActionRegistry.js';
import type {
  ActionContext,
  ActionEvent,
  ActionPhaseDef,
  ActionStatus,
  PhaseExecution,
  RunningAction,
} from './types.js';

type EventListener = (event: ActionEvent) => void;

export class ActionExecutor {
  private readonly registry: ActionRegistry;
  private readonly runningActions = new Map<string, RunningAction>(); // npcId → RunningAction
  private readonly listeners = new Set<EventListener>();

  constructor(registry: ActionRegistry) {
    this.registry = registry;
  }

  /**
   * Subscribe to action events.
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Start an action for an NPC.
   * Returns true if the action was started, false if rejected.
   */
  startAction(
    npcId: string,
    actionCode: string,
    currentTick: number,
    options: { targetId?: string | undefined; targetPosition?: { x: number; y: number; z: number } | undefined } = {},
  ): boolean {
    const def = this.registry.get(actionCode);
    if (!def) {
      console.warn(`[ActionExecutor] Unknown action: ${actionCode}`);
      return false;
    }

    // Check if NPC already has a running action
    const existing = this.runningActions.get(npcId);
    if (existing && existing.status === 'running') {
      if (!existing.definition.interruptible) {
        console.warn(`[ActionExecutor] NPC ${npcId} is busy with non-interruptible action: ${existing.definition.actionCode}`);
        return false;
      }
      // Interrupt current action
      this.interruptAction(npcId, currentTick, actionCode);
    }

    // Build phase executions
    const phases: PhaseExecution[] = def.phases.map((phaseDef) => ({
      phaseDef,
      status: 'pending' as const,
    }));

    const context: ActionContext = {
      npcId,
      actionCode,
      targetId: options.targetId,
      targetPosition: options.targetPosition,
      startedAtTick: currentTick,
    };

    const running: RunningAction = {
      context,
      definition: def,
      status: 'running',
      currentPhaseIndex: 0,
      phases,
      startedAtTick: currentTick,
    };

    // Start first phase
    const firstPhase = phases[0];
    if (firstPhase) {
      firstPhase.status = 'running';
      firstPhase.startedAtTick = currentTick;
    }

    this.runningActions.set(npcId, running);

    this.emit({
      type: 'action_started',
      npcId,
      actionCode,
      targetId: options.targetId,
    });

    if (firstPhase) {
      this.emit({
        type: 'action_phase_changed',
        npcId,
        actionCode,
        phaseCode: firstPhase.phaseDef.phaseCode,
        phaseIndex: 0,
        totalPhases: phases.length,
      });
    }

    return true;
  }

  /**
   * Tick all running actions. Call this from WorldRuntime.onTick().
   * Returns events generated this tick.
   */
  tick(currentTick: number): ActionEvent[] {
    const events: ActionEvent[] = [];

    for (const [npcId, action] of this.runningActions) {
      if (action.status !== 'running') continue;

      const currentPhase = action.phases[action.currentPhaseIndex];
      if (!currentPhase || currentPhase.status !== 'running') continue;

      const phaseDef = currentPhase.phaseDef;
      const ticksElapsed = currentTick - (currentPhase.startedAtTick ?? currentTick);

      // Convert duration from ms to ticks (assuming 200ms per tick = 5 tps)
      const ticksNeeded = Math.max(1, Math.ceil(phaseDef.durationMs / 200));

      if (ticksElapsed >= ticksNeeded) {
        // Complete current phase
        currentPhase.status = 'completed';
        currentPhase.completedAtTick = currentTick;

        // Apply phase effects
        if (phaseDef.effects) {
          for (const [key, value] of Object.entries(phaseDef.effects)) {
            if (typeof value === 'number') {
              events.push({
                type: 'action_effect',
                npcId,
                actionCode: action.context.actionCode,
                effect: { type: 'need_change', target: key, value },
              });
            }
          }
        }

        // Emit phase complete event
        if (phaseDef.eventOnComplete) {
          events.push({
            type: 'action_phase_changed',
            npcId,
            actionCode: action.context.actionCode,
            phaseCode: phaseDef.phaseCode,
            phaseIndex: action.currentPhaseIndex,
            totalPhases: action.phases.length,
          });
        }

        // Move to next phase or complete action
        const nextIndex = action.currentPhaseIndex + 1;
        const nextPhase = action.phases[nextIndex];
        if (nextPhase) {
          action.currentPhaseIndex = nextIndex;
          nextPhase.status = 'running';
          nextPhase.startedAtTick = currentTick;

          events.push({
            type: 'action_phase_changed',
            npcId,
            actionCode: action.context.actionCode,
            phaseCode: nextPhase.phaseDef.phaseCode,
            phaseIndex: nextIndex,
            totalPhases: action.phases.length,
          });
        } else {
          // All phases complete — action done
          action.status = 'completed';
          action.completedAtTick = currentTick;

          events.push({
            type: 'action_completed',
            npcId,
            actionCode: action.context.actionCode,
            durationTicks: currentTick - action.startedAtTick,
          });

          // Clean up
          this.runningActions.delete(npcId);
        }
      }
    }

    return events;
  }

  /**
   * Interrupt the current action for an NPC.
   */
  interruptAction(npcId: string, currentTick: number, interruptedBy?: string): void {
    const action = this.runningActions.get(npcId);
    if (!action || action.status !== 'running') return;

    action.status = 'interrupted';
    action.completedAtTick = currentTick;

    this.emit({
      type: 'action_interrupted',
      npcId,
      actionCode: action.context.actionCode,
      interruptedBy,
    });

    this.runningActions.delete(npcId);
  }

  /**
   * Get the current action for an NPC.
   */
  getRunningAction(npcId: string): RunningAction | undefined {
    return this.runningActions.get(npcId);
  }

  /**
   * Get the current action code for an NPC (for snapshot).
   */
  getCurrentActionCode(npcId: string): string | undefined {
    const action = this.runningActions.get(npcId);
    if (!action || action.status !== 'running') return undefined;
    return action.context.actionCode;
  }

  /**
   * Get the current phase code for an NPC (for snapshot).
   */
  getCurrentPhaseCode(npcId: string): string | undefined {
    const action = this.runningActions.get(npcId);
    if (!action || action.status !== 'running') return undefined;
    const phase = action.phases[action.currentPhaseIndex];
    return phase?.phaseDef.phaseCode;
  }

  /**
   * Get count of running actions.
   */
  get runningCount(): number {
    return this.runningActions.size;
  }

  private emit(event: ActionEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
