"use strict";

module.exports = function ($) {
    return $.require([
        'module!entity/gossip/util/base.js',
        'module!entity/gossip/util/util.js',
        'module!entity/gossip/util/message.js',
        'module!entity/gossip/server.js',
        'module!entity/gossip/peer.js'
    ], function (
        base,
        util,
        message,
        server,
        peer
    ) {

        var obj = function(config) {
            base.init(this);
            this._core = this;
            this.config = {
                ip: config.ip,
                port: config.port,
                seed: config.seed || [],
                relay: config.relay,
                node: config.node,
                max: config.max || 5,
                shard: config.shard || 'default',
                debug: config.debug || false
            };

            this.server = new server(this, {
                ip: this.config.ip,
                port: this.config.port
            });
            this.peer = new peer(this, this.config.seed);

            util.mapOn([this.server, this.peer], {
                'new_peer': (data) => {
                    let p = data.packet, payload = p.payload || {};
                    this.log(data.packet);
                    if (payload.remote && payload.shard === this.config.shard && this.protocol().valid(p)) {
                        this.emit('peer', new message(this, data));
                        this.peer.add(payload.remote, data.socket).then(() => {
                            this.emit('relay_message', data).emit('update_peer', this.peer.get());
                        });
                    }
                },
                'message': (data) => {
                    this.log(data.packet);
                    if (this.protocol().valid(data.packet)) {
                        this.emit('message', new message(this, data));
                    }
                },
                'get_peer': (data) => {
                    this.log(data.packet);
                    if (this.protocol().valid(data.packet) && data.packet.payload.shard === this.config.shard) {
                        this.peer.send(data.socket, this.protocol().create('add_peer', {
                            address: this.peer.address
                        }));
                    }
                },
                'add_peer': (data) => {
                    this.log(data.packet);
                    if (this.protocol().valid(data.packet)) {
                        this.emit('peer', new message(this, data));
                        for (let remote in data.packet.payload.address) {
                            if (!this.peer.address[remote]) {
                                this.peer.address[remote] = 1;
                            }
                        }
                    }
                },
                'error': (err) => {
                    console.log(err);
                    this.emit('error', err);
                }
            });

            this.peer.on('connection', (d) => {
                this.emit('connection', d);
            });

            const relay = (data) => {
                data.packet.health += -1;
                if ($.is.array(data.packet.route)) {
                    data.packet.route.push(this.config.ip + ':' + this.config.port);
                }
                if (data.packet.health > 0) {
                    this.peer.sendOther([data.socket], this.protocol().format.flat(data.packet));
                }
            };

            this.on('relay_message', (data) => {
                if (this.protocol().valid(data.packet)) {
                    if ($.is.function(this.config.relay)) {
                        let a = this.config.relay(data);
                        if ($.is.instance(a, $.promise)) {
                            a.then(() => {
                                relay(data);
                            });
                        } else {
                            if ($.is.bool(a) && a) {
                                relay(data);
                            }
                        }
                    } else {
                        relay(data);
                    }
                }
            });
        };
        obj.prototype = $.extends(base, {
            get: function() {
                return this.peer.get();
            },

            who: function() {
                return (this.config.ip + ':' + this.config.port);
            },

            send: function(data) {
                return this.peer.sendAll(this.protocol().create('message', data));
            }
        });

        return ({'public': obj});
    });
};
