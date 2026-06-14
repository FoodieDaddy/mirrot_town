/**
 * ActionIconSystem — displays action icons above NPCs.
 *
 * When an NPC performs an action without a corresponding animation,
 * an emoji icon is shown above the NPC as a visual fallback.
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

interface IconInstance {
  element: HTMLElement;
  css2d: CSS2DObject;
  npcId: string;
  actionCode: string;
}

const ACTION_ICONS: Record<string, string> = {
  fetch_water: '\u{1F4A7}',
  eat: '\u{1F35A}',
  sleep: '\u{1F4A4}',
  fish: '\u{1F3A3}',
  feed_horse: '\u{1F40E}',
  water_crop: '\u{1F33E}',
  buy_item: '\u{1F4B0}',
  work_task: '⚒️',
  talk: '\u{1F4AC}',
  wander: '\u{1F6B6}',
  wait: '⏳',
  observe: '\u{1F440}',
  clean_home: '\u{1F9F9}',
  water_flower: '\u{1F338}',
};

export class ActionIconSystem {
  private scene: THREE.Scene;
  private icons = new Map<string, IconInstance>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  showIcon(npcId: string, actionCode: string, npcObject: THREE.Object3D): void {
    this.hideIcon(npcId);

    const iconChar = ACTION_ICONS[actionCode] ?? '❓';

    const div = document.createElement('div');
    div.className = 'action-icon';
    div.textContent = iconChar;
    div.style.fontSize = '20px';
    div.style.padding = '2px 6px';
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    div.style.borderRadius = '4px';
    div.style.pointerEvents = 'none';
    div.style.whiteSpace = 'nowrap';

    const css2d = new CSS2DObject(div);

    const box = new THREE.Box3().setFromObject(npcObject);
    const height = box.max.y - box.min.y;
    css2d.position.set(0, height + 0.8, 0);

    npcObject.add(css2d);

    this.icons.set(npcId, { element: div, css2d, npcId, actionCode });
  }

  hideIcon(npcId: string): void {
    const icon = this.icons.get(npcId);
    if (icon) {
      icon.css2d.parent?.remove(icon.css2d);
      this.icons.delete(npcId);
    }
  }

  updateIcon(npcId: string, actionCode: string | null, npcObject: THREE.Object3D): void {
    if (actionCode) {
      this.showIcon(npcId, actionCode, npcObject);
    } else {
      this.hideIcon(npcId);
    }
  }

  getIconForAction(actionCode: string): string {
    return ACTION_ICONS[actionCode] ?? '❓';
  }

  dispose(): void {
    for (const [npcId] of this.icons) {
      this.hideIcon(npcId);
    }
  }
}
