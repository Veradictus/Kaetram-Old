/* global module */

import WebSocket from './websocket';
import log from '../util/log';
import WS from 'ws';

class Connection {
    public id: string;
    public socket: WS

    private server: WebSocket;

    private listenCallback: Function;
    private closeCallback: Function;

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

    listen(callback: Function) {
        this.listenCallback = callback;
    }

    onClose(callback: Function) {
        this.closeCallback = callback;
    }

    send(message: any) {
        this.sendUTF8(JSON.stringify(message));
    }

    sendUTF8(data: any) {
        this.socket.send(data);
    }

    close(reason?: any) {
        if (reason) log.info('[Connection] Closing - ' + reason);

        this.socket.close();
    }
}

export default Connection;
