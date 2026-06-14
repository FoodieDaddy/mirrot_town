/**
 * MemoryFilter — determines which events should become memories.
 */

import type { ActionEvent } from '../actions/types.js';

interface EventMemoryCandidate {
  isCandidate: boolean;
  importance: number;
  emotionalValence: number;
  content: string;
  tags: string[];
}

const EVENT_MEMORY_MAP: Record<string, (event: ActionEvent) => EventMemoryCandidate> = {
  action_completed: (event) => {
    if (event.type !== 'action_completed') return { isCandidate: false, importance: 0, emotionalValence: 0, content: '', tags: [] };

    const { actionCode } = event;

    if (actionCode === 'buy_item') {
      return { isCandidate: true, importance: 6, emotionalValence: 0.3, content: '购买了物品', tags: ['economy', 'purchase'] };
    }
    if (actionCode === 'fish') {
      return { isCandidate: true, importance: 5, emotionalValence: 0.5, content: '钓到了鱼', tags: ['leisure', 'fishing'] };
    }
    if (actionCode === 'talk') {
      return { isCandidate: true, importance: 4, emotionalValence: 0.2, content: '和其他人聊了天', tags: ['social', 'conversation'] };
    }
    if (actionCode === 'work_task') {
      return { isCandidate: true, importance: 5, emotionalValence: 0.1, content: '完成了工作任务', tags: ['work', 'task'] };
    }

    if (['move_to', 'wait', 'observe', 'fetch_water', 'eat', 'water_crop'].includes(actionCode)) {
      return { isCandidate: false, importance: 0, emotionalValence: 0, content: '', tags: [] };
    }

    return { isCandidate: true, importance: 3, emotionalValence: 0, content: `执行了 ${actionCode}`, tags: [actionCode] };
  },
};

export class MemoryFilter {
  evaluate(event: ActionEvent): EventMemoryCandidate {
    const handler = EVENT_MEMORY_MAP[event.type];
    if (!handler) {
      return { isCandidate: false, importance: 0, emotionalValence: 0, content: '', tags: [] };
    }
    return handler(event);
  }
}
