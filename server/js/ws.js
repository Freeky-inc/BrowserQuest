var cls = require("./lib/class"),
    url = require('url'),
    WebSocket = require("ws"), // Utilisation de ws au lieu de websocket-server
    http = require('http'),
    Utils = require('./utils'),
    _ = require('underscore'),
    BISON = require('bison'),
    WS = {},
    useBison = false;

module.exports = WS;

/**
 * Abstract Server and Connection classes
 */
var Server = cls.Class.extend({
    init: function(port) {
        this.port = port;
        this._connections = {};
        this._counter = 0;

        var self = this;

        // Crée un serveur HTTP pour gérer les requêtes de statut
        this._httpServer = http.createServer(function (request, response) {
            var path = url.parse(request.url).pathname;
            switch (path) {
                case '/status':
                    if (self.status_callback) {
                        response.writeHead(200);
                        response.write(self.status_callback());
                        break;
                    }
                default:
                    response.writeHead(404);
            }
            response.end();
        });

        this._httpServer.listen(port, function () {
            log.info("Server is listening on port " + port);
        });

        // Crée un serveur WebSocket
        this._wsServer = new WebSocket.Server({ server: this._httpServer });

        this._wsServer.on('connection', function (socket) {
            var connectionId = self._createId();
            var connection = new WS.WebSocketConnection(connectionId, socket, self);

            if (self.connection_callback) {
                self.connection_callback(connection);
            }

            self.addConnection(connection);
        });
    },

    _createId: function () {
        return '5' + Utils.random(99) + '' + (this._counter++);
    },

    onConnect: function (callback) {
        this.connection_callback = callback;
    },

    onError: function (callback) {
        this.error_callback = callback;
    },

    broadcast: function (message) {
        this.forEachConnection(function (connection) {
            connection.send(message);
        });
    },

    forEachConnection: function (callback) {
        _.each(this._connections, callback);
    },

    addConnection: function (connection) {
        this._connections[connection.id] = connection;
    },

    removeConnection: function (id) {
        delete this._connections[id];
    },

    getConnection: function (id) {
        return this._connections[id];
    },

    onRequestStatus: function (status_callback) {
        this.status_callback = status_callback;
    }
});

/**
 * WebSocketConnection class for ws
 */
WS.WebSocketConnection = cls.Class.extend({
    init: function (id, socket, server) {
        var self = this;

        this.id = id;
        this._socket = socket;
        this._server = server;

        this._socket.on('message', function (message) {
            if (self.listen_callback) {
                if (useBison) {
                    self.listen_callback(BISON.decode(message));
                } else {
                    try {
                        self.listen_callback(JSON.parse(message));
                    } catch (e) {
                        if (e instanceof SyntaxError) {
                            self.close("Received message was not valid JSON.");
                        } else {
                            throw e;
                        }
                    }
                }
            }
        });

        this._socket.on('close', function () {
            if (self.close_callback) {
                self.close_callback();
            }
            self._server.removeConnection(self.id);
        });
    },

    onClose: function (callback) {
        this.close_callback = callback;
    },

    listen: function (callback) {
        this.listen_callback = callback;
    },

    send: function (message) {
        var data;
        if (useBison) {
            data = BISON.encode(message);
        } else {
            data = JSON.stringify(message);
        }
        this._socket.send(data);
    },

    close: function (logError) {
        log.info("Closing connection to " + this._socket._socket.remoteAddress + ". Error: " + logError);
        this._socket.close();
    }
});

WS.MultiVersionWebsocketServer = Server; // Alias pour compatibilité avec l'ancien code