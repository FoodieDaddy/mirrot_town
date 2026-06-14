import { WorldStateStore, type WorldState } from '@jingzhong-biancheng/client-core';

import {
  loadActiveMapPackage,
  type LoadedMapPackage,
  type MapHouse,
} from './MapPackage.js';
import { RoofVisibilityState } from './RoofVisibilityState.js';
import './style.css';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';
type WorldSnapshot = Parameters<WorldStateStore['applySnapshot']>[0];
type WorldDelta = Parameters<WorldStateStore['applyDelta']>[0];
type CharacterViewState = ReturnType<WorldStateStore['getCharacters']>[number];
type WorldObject = ReturnType<WorldStateStore['getObjects']>[number];
type GameTime = NonNullable<WorldState['gameTime']>;
type CharacterAction = NonNullable<CharacterViewState['currentAction']>;
type PublicWorldEvent = WorldState['publicEvents'][number];

type ClientMessage =
  | {
      type: 'viewer_join';
      worldId: string;
      clientSeq: number;
      payload: { clientVersion: string; platform: string };
    }
  | {
      type: 'ping';
      worldId: string;
      clientSeq: number;
      payload?: { clientTime?: number };
    };

type ServerMessageBase = {
  worldId: string;
  seq: number;
  serverTime: number;
};

type ServerMessage =
  | (ServerMessageBase & {
      type: 'world_status';
      payload: {
        simulationMode: string;
        viewerCount: number;
        gameTime?: GameTime;
      };
    })
  | (ServerMessageBase & {
      type: 'world_delta';
      payload: {
        changes: WorldDelta['changes'];
        gameTime?: GameTime;
      };
    })
  | (ServerMessageBase & {
      type: 'world_snapshot';
      payload: WorldSnapshot;
    })
  | (ServerMessageBase & {
      type: 'resync_required';
      payload: { reason: string };
    })
  | (ServerMessageBase & {
      type: 'error';
      payload: { code: string; message: string };
    })
  | (ServerMessageBase & {
      type: 'server_ping';
      payload?: { nonce?: string };
    })
  | (ServerMessageBase & {
      type: 'pong';
      payload?: { clientSeq?: number };
    });

interface ViewerStatus {
  connection: ConnectionState;
  viewerCount: number;
  gameTime: GameTime | null;
  message: string;
}

interface LegacyCharacter {
  id?: unknown;
  name?: unknown;
  position?: unknown;
  characterId?: unknown;
  transform?: unknown;
  regionId?: unknown;
  direction?: unknown;
  currentAction?: unknown;
  state?: unknown;
}

const WORLD_ID = 'default';
const CLIENT_VERSION = '0.1.0';
const HEARTBEAT_INTERVAL_MS = 20_000;
const RECONNECT_DELAY_MS = 3_000;

const actionNames: Readonly<Record<string, string>> = {
  feed_horse: '在马棚添草',
  fetch_water: '沿河取水',
  fish: '临水垂钓',
  make_furniture: '打磨木料',
  observe: '看云辨天',
  plant_flower: '栽种花木',
  practice_medicine: '整理药囊',
  sweep: '洒扫庭院',
  talk: '与邻人闲话',
  wait: '暂歇片刻',
};

const objectNames: Readonly<Record<string, string>> = {
  flower_pot: '门前花盆',
  horse_trough: '马棚食槽',
  lantern_post: '渡口灯柱',
  low_table: '矮木桌',
  notice_board: '村务木牌',
  rice_crop: '稻禾',
  simple_wooden_bed: '木床',
  water_well: '青石水井',
  wooden_chest: '木箱',
};

const fallbackObjects: readonly WorldObject[] = [
  {
    objectId: 'horse_trough_01',
    templateId: 'horse_trough',
    regionId: 'stable',
    transform: { x: 31, y: 17 },
    state: { filled: true },
  },
  {
    objectId: 'water_well_01',
    templateId: 'water_well',
    regionId: 'square',
    transform: { x: 18, y: 15 },
    state: { waterLevel: 86 },
  },
  {
    objectId: 'notice_board_01',
    templateId: 'notice_board',
    regionId: 'square',
    transform: { x: 23, y: 22 },
    state: { notices: 3 },
  },
  {
    objectId: 'flower_pot_01',
    templateId: 'flower_pot',
    regionId: 'home_lin',
    transform: { x: 10, y: 23 },
    state: { growth: 'flowering' },
  },
];

const demoSnapshot: WorldSnapshot = {
  type: 'world_snapshot',
  worldId: WORLD_ID,
  snapshotVersion: 1,
  seq: 1,
  serverTime: Date.now(),
  gameTime: { day: 3, hour: 9, minute: 20, season: 'spring' },
  map: { id: 'jingzhong_biancheng', width: 40, height: 40 },
  characters: [
    createDemoCharacter('a_heng', '阿衡', 9, 21, 'feed_horse', '专注'),
    createDemoCharacter('lin_niang', '林娘', 17, 13, 'plant_flower', '安宁'),
    createDemoCharacter('zhou_mujiang', '周木匠', 27, 17, 'make_furniture', '沉稳'),
    createDemoCharacter('shen_yifu', '沈医夫', 14, 29, 'practice_medicine', '平和'),
    createDemoCharacter('xiao_man', '小满', 31, 23, 'fetch_water', '轻快'),
  ],
  objects: fallbackObjects,
  publicEvents: [
    {
      eventCode: 'morning_market_opened',
      text: '晨雾渐散，渡口边的小集已开。',
      visibility: 'public',
    },
  ],
};

class BrowserWorldClient {
  readonly store = new WorldStateStore(demoSnapshot);

  private socket: WebSocket | null = null;
  private clientSeq = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private closedByClient = false;
  private status: ViewerStatus = {
    connection: 'connecting',
    viewerCount: 1,
    gameTime: demoSnapshot.gameTime,
    message: '正在寻路入镇',
  };
  private readonly statusListeners = new Set<(status: ViewerStatus) => void>();

  async start(): Promise<void> {
    this.closedByClient = false;
    this.setStatus({ connection: 'connecting', message: '正在读取镇中簿册' });

    try {
      await this.fetchSnapshot();
    } catch (error) {
      console.warn('Snapshot unavailable; showing the local observation scene.', error);
      this.setStatus({
        connection: 'disconnected',
        message: '未寻到驿路，现为离线样景',
      });
    }

    this.connectSocket();
  }

  reconnect(): void {
    this.disconnect();
    void this.start();
  }

  disconnect(): void {
    this.closedByClient = true;
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
  }

  subscribeStatus(listener: (status: ViewerStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private async fetchSnapshot(): Promise<void> {
    const response = await fetch(`${apiBaseUrl()}/api/worlds/${WORLD_ID}/snapshot`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Snapshot request failed with ${response.status}`);
    }

    const snapshot = normalizeSnapshot(await response.json());
    this.store.applySnapshot(snapshot);
    this.setStatus({ gameTime: snapshot.gameTime });
  }

  private connectSocket(): void {
    this.clearTimers();
    this.setStatus({ connection: 'connecting', message: '水路相接，等待入镇' });

    const clientId = getClientId();
    const socket = new WebSocket(
      `${webSocketBaseUrl()}/ws/worlds/${WORLD_ID}?clientId=${encodeURIComponent(clientId)}`,
    );
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.setStatus({ connection: 'connected', message: '已在镇外静观' });
      this.send({
        type: 'viewer_join',
        worldId: WORLD_ID,
        clientSeq: this.nextClientSeq(),
        payload: { clientVersion: CLIENT_VERSION, platform: 'web' },
      });
      this.heartbeatTimer = window.setInterval(() => {
        this.send({
          type: 'ping',
          worldId: WORLD_ID,
          clientSeq: this.nextClientSeq(),
          payload: { clientTime: Date.now() },
        });
      }, HEARTBEAT_INTERVAL_MS);
    });

    socket.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });

    socket.addEventListener('close', () => {
      if (this.socket !== socket) {
        return;
      }
      this.clearTimers();
      this.socket = null;
      this.setStatus({ connection: 'disconnected', message: '水路暂断，稍后重连' });

      if (!this.closedByClient) {
        this.reconnectTimer = window.setTimeout(() => {
          void this.start();
        }, RECONNECT_DELAY_MS);
      }
    });

    socket.addEventListener('error', () => {
      this.setStatus({ connection: 'disconnected', message: '驿路不通，仍可查看样景' });
    });
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }

    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case 'world_status':
        this.setStatus({
          viewerCount: message.payload.viewerCount,
          gameTime: message.payload.gameTime ?? this.status.gameTime,
        });
        break;
      case 'world_delta': {
        const delta: WorldDelta = {
          type: 'world_delta',
          worldId: message.worldId,
          seq: message.seq,
          serverTime: message.serverTime,
          changes: message.payload.changes,
          ...(message.payload.gameTime === undefined
            ? {}
            : { gameTime: message.payload.gameTime }),
        };
        const result = this.store.applyDelta(delta);
        if (result.status === 'gap') {
          void this.fetchSnapshot();
        }
        break;
      }
      case 'world_snapshot':
        this.store.applySnapshot(normalizeSnapshot(message.payload));
        break;
      case 'resync_required':
        void this.fetchSnapshot();
        break;
      case 'error':
        this.setStatus({ message: `驿站回报：${message.payload.message}` });
        break;
      case 'pong':
      case 'server_ping':
        break;
    }
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private nextClientSeq(): number {
    this.clientSeq += 1;
    return this.clientSeq;
  }

  private setStatus(patch: Partial<ViewerStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) {
      listener(this.status);
    }
  }

  private clearTimers(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

function createDemoCharacter(
  characterId: string,
  name: string,
  x: number,
  y: number,
  actionCode: string,
  mood: string,
): CharacterViewState {
  return {
    characterId,
    name,
    transform: { x, y },
    currentAction: {
      actionCode,
      startedAt: Date.now(),
    },
    state: { mood },
  };
}

function normalizeSnapshot(value: unknown): WorldSnapshot {
  if (!isRecord(value)) {
    throw new Error('Snapshot must be an object');
  }

  const characters = Array.isArray(value.characters)
    ? value.characters.map((character, index) => normalizeCharacter(character, index))
    : [];

  const objects = Array.isArray(value.objects)
    ? value.objects.filter(isWorldObject)
    : [];

  return {
    type: 'world_snapshot',
    worldId: typeof value.worldId === 'string' ? value.worldId : WORLD_ID,
    snapshotVersion:
      typeof value.snapshotVersion === 'number' ? value.snapshotVersion : 0,
    seq:
      typeof value.seq === 'number'
        ? value.seq
        : typeof value.snapshotVersion === 'number'
          ? value.snapshotVersion
          : 0,
    serverTime: typeof value.serverTime === 'number' ? value.serverTime : Date.now(),
    gameTime: isGameTime(value.gameTime)
      ? value.gameTime
      : { day: 1, hour: 6, minute: 0, season: 'spring' },
    characters,
    objects,
    ...(isRecord(value.map) ? { map: value.map } : {}),
    ...(Array.isArray(value.regions) ? { regions: value.regions.filter(isRecord) } : {}),
    ...(Array.isArray(value.animals) ? { animals: value.animals.filter(isRecord) } : {}),
    ...(Array.isArray(value.publicEvents)
      ? { publicEvents: value.publicEvents.filter(isPublicWorldEvent) }
      : {}),
  };
}

function normalizeCharacter(value: unknown, index: number): CharacterViewState {
  const character = (isRecord(value) ? value : {}) as LegacyCharacter;
  const fallback = demoSnapshot.characters[index % demoSnapshot.characters.length];
  const transform = isTransform(character.transform)
    ? character.transform
    : isTransform(character.position)
      ? character.position
      : (fallback?.transform ?? { x: 20, y: 20 });
  const currentAction = isCharacterAction(character.currentAction)
    ? character.currentAction
    : fallback?.currentAction;

  return {
    characterId:
      typeof character.characterId === 'string'
        ? character.characterId
        : typeof character.id === 'string'
          ? character.id
          : `villager_${index + 1}`,
    transform,
    ...(typeof character.name === 'string'
      ? { name: character.name }
      : fallback?.name === undefined
        ? {}
        : { name: fallback.name }),
    ...(typeof character.regionId === 'string'
      ? { regionId: character.regionId }
      : {}),
    ...(typeof character.direction === 'string'
      ? { direction: character.direction }
      : {}),
    ...(currentAction === undefined ? {} : { currentAction }),
    ...(isRecord(character.state)
      ? { state: character.state }
      : fallback?.state === undefined
        ? {}
        : { state: fallback.state }),
  };
}

function isCharacterAction(value: unknown): value is CharacterAction {
  return (
    isRecord(value) &&
    typeof value.actionCode === 'string' &&
    typeof value.startedAt === 'number'
  );
}

function isPublicWorldEvent(value: unknown): value is PublicWorldEvent {
  return (
    isRecord(value) &&
    typeof value.eventCode === 'string' &&
    typeof value.text === 'string'
  );
}

function isWorldObject(value: unknown): value is WorldObject {
  return (
    isRecord(value) &&
    typeof value.objectId === 'string' &&
    typeof value.templateId === 'string' &&
    typeof value.regionId === 'string' &&
    isTransform(value.transform) &&
    isRecord(value.state)
  );
}

function isTransform(value: unknown): value is { x: number; y: number } {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number'
  );
}

function isGameTime(value: unknown): value is GameTime {
  return (
    isRecord(value) &&
    typeof value.day === 'number' &&
    typeof value.hour === 'number' &&
    typeof value.minute === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return configured?.replace(/\/$/, '') ?? '';
}

function webSocketBaseUrl(): string {
  const configured = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
}

function getClientId(): string {
  const key = 'jingzhong-biancheng-viewer-id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const id = window.crypto.randomUUID();
  window.sessionStorage.setItem(key, id);
  return id;
}

function actionLabel(character: CharacterViewState): string {
  const actionCode = character.currentAction?.actionCode;
  if (!actionCode) {
    return '闲步观望';
  }
  return actionNames[actionCode] ?? actionCode.replaceAll('_', ' ');
}

function objectLabel(object: WorldObject): string {
  return objectNames[object.templateId] ?? object.templateId.replaceAll('_', ' ');
}

function moodLabel(character: CharacterViewState): string {
  const mood = character.state?.mood;
  return typeof mood === 'string' ? mood : '平常';
}

function mapPointStyle(
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
): string {
  const left = (clamp(x, 0, sourceWidth) / sourceWidth) * 100;
  const top = (clamp(y, 0, sourceHeight) / sourceHeight) * 100;
  return `left:${left.toFixed(3)}%;top:${top.toFixed(3)}%`;
}

function mapRectangleStyle(house: MapHouse, map: LoadedMapPackage): string {
  const left = (house.x / map.width) * 100;
  const top = (house.y / map.height) * 100;
  const width = (house.width / map.width) * 100;
  const height = (house.height / map.height) * 100;
  return [
    `left:${left.toFixed(3)}%`,
    `top:${top.toFixed(3)}%`,
    `width:${width.toFixed(3)}%`,
    `height:${height.toFixed(3)}%`,
  ].join(';');
}

function roofClipStyle(house: MapHouse, map: LoadedMapPackage): string {
  const top = (house.y / map.height) * 100;
  const right = ((map.width - house.x - house.width) / map.width) * 100;
  const bottom = ((map.height - house.y - house.height) / map.height) * 100;
  const left = (house.x / map.width) * 100;
  return `clip-path:inset(${top.toFixed(3)}% ${right.toFixed(3)}% ${bottom.toFixed(
    3,
  )}% ${left.toFixed(3)}%)`;
}

function mapDimension(
  map: Readonly<Record<string, unknown>> | null,
  key: 'width' | 'height',
  fallback: number,
): number {
  const value = map?.[key];
  return typeof value === 'number' && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seasonName(season: string | undefined): string {
  const names: Readonly<Record<string, string>> = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬',
  };
  return names[season ?? ''] ?? '时';
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

let globalFrame = 0;
setInterval(() => {
  globalFrame++;
  if (currentState) {
    render(currentState, currentStatus);
  }
}, 125); // 8 FPS

function getSpriteStyle(character: CharacterViewState, asset: any): string {
  if (!asset || !asset.frameWidth || !asset.frameHeight) return '';

  const direction = (character.state as any)?.direction || 'down';
  const isMoving = (character.state as any)?.isMoving;
  
  let animName = isMoving ? `walk-${direction}` : `idle-front`;
  if (direction === 'right' && isMoving) animName = 'walk-left';
  if (direction === 'right' && !isMoving) animName = 'idle-left';

  const anim = asset.animations[animName] || asset.animations['idle-front'];
  if (!anim) return '';

  let frame = 0;
  if (typeof anim.frame === 'number') {
    frame = anim.frame;
  } else if (typeof anim.start === 'number' && typeof anim.end === 'number') {
    const range = anim.end - anim.start + 1;
    frame = anim.start + (globalFrame % range);
  }

  const col = frame % 6; // Assuming 6 columns as per metadata
  const row = Math.floor(frame / 6);

  const x = -(col * asset.frameWidth);
  const y = -(row * asset.frameHeight);

  let style = `width: ${asset.frameWidth}px; height: ${asset.frameHeight}px; background-image: url(${asset.spritesheet}); background-position: ${x}px ${y}px;`;
  
  // Scale down to fit better (e.g., 64px height)
  const scale = 64 / asset.frameHeight;
  style += ` transform: scale(${scale}) translateY(-50%); transform-origin: top center;`;

  if (direction === 'right') {
    style += ' filter: flipX; transform: scaleX(-1) scale(' + scale + ') translateY(-50%);';
  }

  return style;
}

function render(state: WorldState, status: ViewerStatus): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('Missing #app mount point');
  }

  const mapPackage = activeMapPackage;
  const renderMode = (state.map as any)?.renderMode || 'tilemap';
  const is25D = renderMode === 'background_2_5d';
  
  const characters = [...state.characters.values()].slice(0, 10);
  const objects =
    state.objects.size > 0
      ? [...state.objects.values()].slice(0, 6)
      : (mapPackage?.initialObjects.slice(0, 6) ?? fallbackObjects);
  const gameTime = state.gameTime ?? status.gameTime ?? demoSnapshot.gameTime;
  const latestEvent =
    state.publicEvents.at(-1)?.text ?? '晨雾渐散，村中各家已陆续生火。';
  const connectionLabel = {
    connected: '已连接',
    connecting: '连接中',
    disconnected: '离线样景',
  }[status.connection];
  const roofState = roofVisibility.getState();
  
  const sourceMapWidth = (state.map as any)?.gridWidth || mapDimension(state.map, 'width', 40);
  const sourceMapHeight = (state.map as any)?.gridHeight || mapDimension(state.map, 'height', 40);
  
  const mapHouses = mapPackage?.houses ?? [];
  const mapAssets = (state as any).assets?.mapAssets;
  const backgroundUrl = mapAssets?.map?.background;
  const charAssets = (state as any).assets?.characterAssets || [];

  root.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="seal" aria-hidden="true">镜中<br />边城</div>
          <div class="title-block">
            <h1>镜中边城</h1>
            <p>乱世边缘 · 江南日常观察录</p>
          </div>
        </div>
        <div class="status-ribbon" aria-label="连接与观看状态">
          <span class="connection" data-state="${status.connection}">
            <i class="connection-dot" aria-hidden="true"></i>
            ${connectionLabel}
          </span>
          <span>${escapeHtml(status.message)}</span>
          <span>同观 ${status.viewerCount} 人</span>
          <button class="reconnect" id="reconnect" type="button">重寻驿路</button>
        </div>
      </header>

      <div class="layout">
        <section class="world-card" aria-label="镜中边城世界观察画面">
          <div class="world-heading">
            <p class="eyebrow">JINGZHONG BIANCHENG · LIVE</p>
            <h2>${escapeHtml((state.map as any)?.mapId === 'worldx_bianjing_night_market_v0' ? '汴京夜市' : (mapPackage?.title ?? '临水人家'))}</h2>
            <p>这里只观看，不惊扰镇中人的日常。</p>
          </div>
          ${is25D ? '' : `
          <div class="roof-controls" aria-label="房屋屋顶显示">
            <span>屋顶</span>
            <button
              id="hide-all-roofs"
              type="button"
              ${roofState.mode === 'ALL_HIDDEN' ? 'disabled' : ''}
            >
              全部隐藏屋顶
            </button>
            <button
              id="show-all-roofs"
              type="button"
              ${
                roofState.mode === 'NORMAL' && roofState.hiddenHouseIds.size === 0
                  ? 'disabled'
                  : ''
              }
            >
              全部显示屋顶
            </button>
          </div>
          `}
          <div class="town map-town ${is25D ? 'mode-25d' : ''}">
            ${
              is25D 
                ? `<img class="map-image" src="${backgroundUrl}" alt="" draggable="false" style="object-fit: contain; background: #000;" />`
                : (mapPackage
                ? `
                  <img
                    class="map-image"
                    src="${mapPackage.previewUrl}"
                    alt=""
                    draggable="false"
                  />
                  ${mapHouses
                    .filter((house) => roofVisibility.isRoofHidden(house.houseId))
                    .map(
                      (house) => `
                        <img
                          class="map-image map-roof-cutout"
                          src="${mapPackage.roofsHiddenPreviewUrl}"
                          alt=""
                          draggable="false"
                          style="${roofClipStyle(house, mapPackage)}"
                        />
                      `,
                    )
                    .join('')}
                  ${mapHouses
                    .map(
                      (house) => `
                        <button
                          class="map-house-hit${
                            roofVisibility.isRoofHidden(house.houseId)
                              ? ' roof-hidden'
                              : ''
                          }"
                          style="${mapRectangleStyle(house, mapPackage)}"
                          type="button"
                          data-house-id="${house.houseId}"
                          aria-label="${escapeHtml(house.name)}：${
                            roofVisibility.isRoofHidden(house.houseId)
                              ? '屋顶已隐藏，点击显示'
                              : '屋顶已显示，点击隐藏'
                          }"
                          aria-pressed="${roofVisibility.isRoofHidden(house.houseId)}"
                          ${
                            roofState.mode === 'ALL_HIDDEN'
                              ? 'disabled title="全部隐藏模式下不可单独切换"'
                              : `title="点击切换${escapeHtml(house.name)}屋顶"`
                          }
                        ></button>
                      `,
                    )
                    .join('')}
                `
                : '<div class="map-loading">正在展开江南舆图...</div>')
            }
            ${characters
              .map(
                (character, index) => {
                  const asset = charAssets.find((a: any) => a.characterId === character.characterId);
                  const spritesheet = asset?.spritesheet;
                  const statusIcon = (character.state as any)?.statusIcon;
                  return `
                  <div class="npc map-npc" style="${mapPointStyle(
                    character.transform.x,
                    character.transform.y,
                    sourceMapWidth,
                    sourceMapHeight,
                  )}; z-index: ${100 + Math.floor(character.transform.y)};">
                    ${statusIcon ? `<div class="npc-status-icon">${statusIcon}</div>` : ''}
                    ${asset 
                      ? `<div class="npc-sprite" style="${getSpriteStyle(character, asset)}"></div>`
                      : `<i class="npc-figure" style="--npc-color:${
                      ['#667462', '#7b665c', '#6d716d', '#657476', '#8a7859'][index % 5]
                    }"></i>`}
                    <span class="npc-label">
                      <strong>${escapeHtml(character.name ?? character.characterId)}</strong>
                      <span>${escapeHtml(actionLabel(character))}</span>
                    </span>
                  </div>
                `;
                },
              )
              .join('')}
          </div>
        </section>

        <aside class="side-column" aria-label="世界观察信息">
          <section class="panel time-panel">
            <div>
              <div class="day">第 ${gameTime.day} 日</div>
              <div class="clock">${String(gameTime.hour).padStart(2, '0')}:${String(
                gameTime.minute,
              ).padStart(2, '0')}</div>
            </div>
            <div class="season-stamp" title="${escapeHtml(gameTime.season ?? '')}">
              ${seasonName(gameTime.season)}
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <h2>人物志</h2>
              <span>${characters.length} 户人影</span>
            </div>
            <div class="people-list">
              ${characters
                .map(
                  (character, index) => `
                    <div class="person-row">
                      <span class="person-index">${String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <div class="person-name">${escapeHtml(
                          character.name ?? character.characterId,
                        )}</div>
                        <div class="person-action">${escapeHtml(actionLabel(character))}</div>
                      </div>
                      <span class="person-mood">${escapeHtml(moodLabel(character))}</span>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <h2>镇中物件</h2>
              <span>${objects.length} 件可见</span>
            </div>
            <div class="object-list">
              ${objects
                .map(
                  (object) => `
                    <div class="object-row">
                      <div>
                        <div class="object-name">${escapeHtml(objectLabel(object))}</div>
                        <div class="object-kind">${escapeHtml(object.regionId)}</div>
                      </div>
                      <span class="person-mood">${object.enabled === false ? '停用' : '在用'}</span>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <h2>村中记事</h2>
              <span>近闻</span>
            </div>
            <p class="event-note">${escapeHtml(latestEvent)}</p>
          </section>
        </aside>
      </div>
      <p class="footer-note">WORLD ${escapeHtml(state.worldId ?? WORLD_ID)} · SNAPSHOT ${
        state.snapshotVersion ?? '—'
      } · MAP ${escapeHtml(mapPackage?.id ?? 'loading')}</p>
    </main>
  `;

  root.querySelector<HTMLButtonElement>('#reconnect')?.addEventListener('click', () => {
    client.reconnect();
  });

  root.querySelector('.map-town')?.addEventListener('click', (event: Event) => {
    const e = event as MouseEvent;
    const town = e.currentTarget as HTMLElement;
    const rect = town.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * sourceMapWidth;
    const y = ((e.clientY - rect.top) / rect.height) * sourceMapHeight;
    
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    const navGrid = (state.map as any)?.navGrid;
    if (navGrid && navGrid.walkable) {
      const isWalkable = navGrid.walkable[gridY]?.[gridX] === 1;
      console.log(`Clicked grid (${gridX}, ${gridY}), walkable: ${isWalkable}`);
      if (!isWalkable) {
          // Show a temporary red dot or alert
          const dot = document.createElement('div');
          dot.style.position = 'absolute';
          dot.style.left = `${(e.clientX - rect.left)}px`;
          dot.style.top = `${(e.clientY - rect.top)}px`;
          dot.style.width = '10px';
          dot.style.height = '10px';
          dot.style.background = 'red';
          dot.style.borderRadius = '50%';
          dot.style.transform = 'translate(-50%, -50%)';
          dot.style.zIndex = '1000';
          dot.style.pointerEvents = 'none';
          town.appendChild(dot);
          setTimeout(() => dot.remove(), 500);
      }
    }
  });

  root.querySelectorAll<HTMLButtonElement>('[data-house-id]').forEach((house) => {
    house.addEventListener('click', () => {
      const houseId = house.dataset.houseId;
      if (!houseId) {
        return;
      }
      roofVisibility.toggleHouse(houseId);
      render(currentState, currentStatus);
    });
  });

  root.querySelector<HTMLButtonElement>('#hide-all-roofs')?.addEventListener('click', () => {
    roofVisibility.hideAll();
    render(currentState, currentStatus);
  });

  root.querySelector<HTMLButtonElement>('#show-all-roofs')?.addEventListener('click', () => {
    roofVisibility.showAll();
    render(currentState, currentStatus);
  });
}

const roofVisibility = new RoofVisibilityState();
let activeMapPackage: LoadedMapPackage | null = null;
const client = new BrowserWorldClient();
let currentState = client.store.getState();
let currentStatus: ViewerStatus = {
  connection: 'connecting',
  viewerCount: 1,
  gameTime: currentState.gameTime,
  message: '正在寻路入镇',
};

client.store.subscribe((state) => {
  currentState = state;
  render(currentState, currentStatus);
});

client.subscribeStatus((status) => {
  currentStatus = status;
  render(currentState, currentStatus);
});

render(currentState, currentStatus);
void loadActiveMapPackage()
  .then((mapPackage) => {
    activeMapPackage = mapPackage;
    roofVisibility.showAll();
    render(currentState, currentStatus);
  })
  .catch((error: unknown) => {
    console.error('Failed to load the active map package.', error);
  });
void client.start();

window.addEventListener('beforeunload', () => client.disconnect());
