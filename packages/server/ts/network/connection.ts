import WebSocket from './websocket';
import log from '../util/log';
import WS from 'ws';

type ListenCallback = (data: JSON) => void;
type CloseCallback = () => void;

class Connection {
    public id: string;
    public socket: any;

    private server: WebSocket;

    private listenCallback: ListenCallback;
    private closeCallback: CloseCallback;

    constructor(id: string, socket: WS, server: WebSocket) {
        this.id = id;
        this.socket = socket;
        this.server = server;

        this.socket.on('message', (message: any) => {
            try {
                if (this.listenCallback) this.listenCallback(JSON.parse(message));
            } catch (e) {
                log.error('Could not parse message: ' + message);
                console.log(e);
            }
        });

        this.socket.on('close', () => {
            log.info('Closed socket: ' + this.socket.conn.remoteAddress);

            if (this.closeCallback) this.closeCallback();

            this.server.remove(this.id);
        });
    }

    getRemoteAddress(): string {
        return this.socket.conn.remoteAddress;
    }

    listen(callback: ListenCallback): void {
        this.listenCallback = callback;
    }

    onClose(callback: CloseCallback): void {
        this.closeCallback = callback;
    }

    send(message: JSON): void {
        this.sendUTF8(JSON.stringify(message));
    }

    sendUTF8(message: string): void {
        this.socket.send(message);
    }

    close(reason?: string): void {
        if (reason) log.info('[Connection] Closing - ' + reason);

        this.socket.close();
    }
}

export default Connection;
