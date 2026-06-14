/**
 * Action System Types
 *
 * Action = 过程（NPC 执行的动作）
 * Event  = 世界中发生过的事实
 * Animation = 前端表现
 */

// ─── Action Definition (from JSON) ──────────────────────────

export interface ActionPhaseDef {
  phaseCode: string;
  durationMs: number;
  requiredAnimationCode: string;
  fallbackAnimationCode?: string;
  fallbackIcon?: string;
  canInterrupt?: boolean;
  eventOnStart?: string;
  eventOnComplete?: string;
  effects?: Record<string, unknown>;
}

export interface ActionDefinition {
  actionCode: string;
  name: string;
  category: 'movement' | 'life' | 'work' | 'social' | 'leisure' | 'map_change';
  description: string;
  targetType: 'self' | 'object' | 'character' | 'region' | 'point';
  requiredTags: string[];
  preconditions: Record<string, unknown>;
  effects: Record<string, unknown>;
  fallbackMode: 'icon' | 'generic' | 'skip';
  interruptible: boolean;
  enabled: boolean;
  phases: ActionPhaseDef[];
}

// ─── Action Execution State ─────────────────────────────────

export type ActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';

export interface ActionContext {
  npcId: string;
  actionCode: string;
  targetId?: string | undefined;
  targetPosition?: { x: number; y: number; z: number } | undefined;
  startedAtTick: number;
}

export interface PhaseExecution {
  phaseDef: ActionPhaseDef;
  status: 'pending' | 'running' | 'completed';
  startedAtTick?: number;
  completedAtTick?: number;
}

export interface RunningAction {
  context: ActionContext;
  definition: ActionDefinition;
  status: ActionStatus;
  currentPhaseIndex: number;
  phases: PhaseExecution[];
  startedAtTick: number;
  completedAtTick?: number;
  failureReason?: string;
}

// ─── Events emitted by ActionExecutor ───────────────────────

export interface ActionStartedEvent {
  type: 'action_started';
  npcId: string;
  actionCode: string;
  targetId?: string | undefined;
}

export interface ActionPhaseChangedEvent {
  type: 'action_phase_changed';
  npcId: string;
  actionCode: string;
  phaseCode: string;
  phaseIndex: number;
  totalPhases: number;
}

export interface ActionCompletedEvent {
  type: 'action_completed';
  npcId: string;
  actionCode: string;
  durationTicks: number;
}

export interface ActionFailedEvent {
  type: 'action_failed';
  npcId: string;
  actionCode: string;
  reason: string;
}

export interface ActionInterruptedEvent {
  type: 'action_interrupted';
  npcId: string;
  actionCode: string;
  interruptedBy?: string | undefined;
}

// ─── Effect Application ─────────────────────────────────

export interface EffectApplication {
  type: 'need_change' | 'item_add' | 'item_remove' | 'money_change';
  target: string; // need name, item code, or 'balance'
  value: number;
}

export interface ActionEffectEvent {
  type: 'action_effect';
  npcId: string;
  actionCode: string;
  effect: EffectApplication;
}

export type ActionEvent =
  | ActionStartedEvent
  | ActionPhaseChangedEvent
  | ActionCompletedEvent
  | ActionFailedEvent
  | ActionInterruptedEvent
  | ActionEffectEvent;
