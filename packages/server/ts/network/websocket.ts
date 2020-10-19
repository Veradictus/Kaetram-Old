import Socket from './socket';
import log from '../util/log';
import config from '../../config';

import Connection from './connection';
import WS from 'ws';
import http from 'http';
import https from 'https';
import Utils from '../util/utils';

class WebSocket extends Socket {
    host: string;
    version: string;
    ips: {};

    httpServer: http.Server | https.Server;
    ws: WS.Server;

    public connectionCallback: any;
    public webSocketReadyCallback: any;

    constructor(host: string, port: number, version: string) {
        super(port);

        this.host = host;
        this.version = version;

        this.ips = {};

        let readyWebSocket = (port: number) => {
            log.info('Server is now listening on: ' + config.port);

            if (this.webSocketReadyCallback) this.webSocketReadyCallback();
        };

        let server = config.ssl ? https : http;

        this.httpServer = server
            .createServer((_request, response) => {
                response.writeHead(200, { 'Content-Type': 'text/plain' });
                response.write('This is server, why are you here?');
                response.end();
            })
            .listen(port, host, () => {
                readyWebSocket(port);
            });

        this.ws = new WS.Server({ port: config.port });

        this.ws.on('connection', (socket: any, request: any) => {
            let mappedAddress = request.socket.remoteAddress,
                remoteAddress = mappedAddress.split('::ffff:')[1];

            socket.conn = { remoteAddress: remoteAddress };

            log.info('Received raw websocket connection from: ' + socket.conn.remoteAddress);

            let client = new Connection(this.createId(), socket, this, true);

            if (this.connectionCallback) this.connectionCallback(client);

            this.addConnection(client);
        });
    }

    createId() {
        return '1' + Utils.random(9999) + '' + this._counter++;
    }

    onConnect(callback: Function) {
        this.connectionCallback = callback;
    }

    onWebSocketReady(callback: Function) {
        this.webSocketReadyCallback = callback;
    }
}

export default WebSocket;
