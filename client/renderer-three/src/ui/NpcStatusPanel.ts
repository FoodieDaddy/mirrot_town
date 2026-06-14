/**
 * NpcStatusPanel — shows NPC details when clicked.
 */

import type { NpcState } from '@jingzhong-biancheng/shared';

interface NpcStatusData {
  npc: NpcState;
  needs?: { hunger: number; thirst: number; energy: number; social: number; comfort: number };
  balance?: number;
  recentMemories?: string[];
}

export class NpcStatusPanel {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private currentNpcId: string | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'npc-status-panel';
    this.container.style.cssText = `
      position: fixed;
      right: 20px;
      top: 20px;
      width: 280px;
      background: rgba(30, 30, 30, 0.9);
      color: white;
      border-radius: 8px;
      padding: 16px;
      font-family: sans-serif;
      font-size: 13px;
      display: none;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(this.container);
  }

  show(data: NpcStatusData): void {
    this.currentNpcId = data.npc.id;
    this.isVisible = true;

    const { npc, needs, balance, recentMemories } = data;

    const needsHtml = needs ? `
      <div style="margin: 8px 0;">
        ${this.renderNeedBar('饱食', needs.hunger)}
        ${this.renderNeedBar('口渴', needs.thirst)}
        ${this.renderNeedBar('精力', needs.energy)}
        ${this.renderNeedBar('社交', needs.social)}
        ${this.renderNeedBar('舒适', needs.comfort)}
      </div>
    ` : '';

    const balanceHtml = balance !== undefined
      ? `<div style="margin: 8px 0;">💰 余额: ${balance} 铜钱</div>`
      : '';

    const memoriesHtml = recentMemories && recentMemories.length > 0
      ? `<div style="margin: 8px 0;">
          <div style="font-weight: bold; margin-bottom: 4px;">最近记忆:</div>
          ${recentMemories.map(m => `<div style="margin: 2px 0; font-size: 12px; opacity: 0.8;">• ${m}</div>`).join('')}
        </div>`
      : '';

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 16px; font-weight: bold;">${npc.displayName}</div>
        <div style="cursor: pointer; opacity: 0.6;" onclick="this.parentElement.parentElement.style.display='none'">✕</div>
      </div>
      <div style="opacity: 0.7; margin-bottom: 8px;">${npc.role || '村民'}</div>
      <div style="margin: 8px 0;">
        当前: ${npc.currentAction || '空闲'} ${this.getActionEmoji(npc.currentAction)}
      </div>
      ${needsHtml}
      ${balanceHtml}
      ${memoriesHtml}
    `;

    this.container.style.display = 'block';
  }

  hide(): void {
    this.isVisible = false;
    this.currentNpcId = null;
    this.container.style.display = 'none';
  }

  isShowing(npcId: string): boolean {
    return this.isVisible && this.currentNpcId === npcId;
  }

  private renderNeedBar(name: string, value: number): string {
    const percentage = Math.round(value);
    const color = percentage > 60 ? '#4caf50' : percentage > 30 ? '#ff9800' : '#f44336';
    return `
      <div style="display: flex; align-items: center; margin: 3px 0;">
        <span style="width: 40px; font-size: 11px;">${name}</span>
        <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 0 8px;">
          <div style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 4px;"></div>
        </div>
        <span style="width: 30px; text-align: right; font-size: 11px;">${percentage}</span>
      </div>
    `;
  }

  private getActionEmoji(actionCode?: string): string {
    const emojiMap: Record<string, string> = {
      fetch_water: '💧', eat: '🍚', sleep: '💤', fish: '🎣',
      feed_horse: '🐴', water_crop: '🌾', buy_item: '💰',
      work_task: '⚒️', talk: '💬',
    };
    return actionCode ? (emojiMap[actionCode] ?? '') : '';
  }

  dispose(): void {
    this.container.remove();
  }
}
