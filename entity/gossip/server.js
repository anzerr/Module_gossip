"use strict";

module.exports = function ($) {
    return $.require([
        'module!entity/gossip/util/base.js',
        'node!net'
    ], function (
        base,
        net
    ) {

        const obj = function(core, address) {
            base.init(this);
            this._core = core;

            let i = 0, max = 50;
            this.socket = {};
            this.payload = {};
            if (this._core.config.node) {
                this.server = net.createServer((socket) => {
                    var key = $.key.short();

                    this.protocol().bind(socket, (packet) => {
                        for (var i in packet) {
                            this.protocol().route(packet[i], this, socket);
                        }
                    }).on('close', () => {
                        this.socket[key] = null;
                        if (i % max == 0) {
                            this.cleanUp();
                        }
                        i += 1;
                    }).on('error', (err) => {
                        this.emit('error', {remote: 'server', err: err});
                        this.socket[key] = null;
                        if (i % max == 0) {
                            this.cleanUp();
                        }
                        i += 1;
                    });
                    this.socket[key] = socket;
                });
                this.server.on('error', (err) => {
                    this.emit('error', {remote: 'server', err: err});
                    this.log('server err', err);
                });

                this.server.listen({host: address.ip, port: address.port},() => {
                    //console.log('opened server on', this.server.address());
                });
            } else {
                this.server = null;
            }
        };
        obj.prototype = $.extends(base, {
            cleanUp: function() {
                const o = {};
                for (let i in this.socket) {
                    if (this.socket[i]) {
                        o[i] = this.socket[i];
                    }
                }
                return (this.socket = o);
            }
        });

        return ({'private': obj});
    });
};
