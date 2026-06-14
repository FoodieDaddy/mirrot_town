import type { ClientMessage } from '@jingzhong-biancheng/shared';

export class WorldCommandAdapter {
    private socket: WebSocket | null = null;

    public setSocket(socket: WebSocket) {
        this.socket = socket;
    }

    public sendCommand(message: ClientMessage) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send command, socket not open');
        }
    }
}
