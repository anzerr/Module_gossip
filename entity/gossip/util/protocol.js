"use strict";

module.exports = function ($) {
    return $.require([
        //
    ], function (
        //
    ) {

        const event = {
            1: 'new_peer'
        }, s = $.config.get('env.session');

        const format = {
            json: function(data) {
                let json = ($.is.object(data))? data : $.json.parse(data);
                if (json && json.length == 6) {
                    return {
                        hash: json[0],
                        event: event[json[1]] || json[1],
                        payload: json[2],
                        time: json[3],
                        health: json[4],
                        route: json[5]
                    };
                }
                return null;
            },
            flat: function(payload) {
                return [payload.hash, payload.event, payload.payload, payload.time, payload.health, payload.route];
            }
        };


        const obj = function(core) {
            this._core = core;
            this.payload = {};
        };
        obj.prototype = {
            format: format,

            route: function(data, e, socket) {
                let packet = this.format.json(data);
                if (packet && !this.payload[packet.hash]) {
                    this.payload[packet.hash] = $.time.now().minute(10).get;
                    e.emit(packet.event, {
                        packet: packet,
                        socket: socket
                    });
                }
            },

            valid: function(packet) {
                return (packet && packet.health > 0 && packet.time > $.time.now().get);
            },

            create: function(event, payload) {
                var hash = $.crypto.hash(s + '_' + $.key.random());
                this.payload[hash] = $.time.now().minute(10).get;
                return [
                    hash,
                    event,
                    payload || {},
                    $.time.now().minute(2).get,
                    32,
                    [this._core.config.ip + ':' + this._core.config.port]
                ];
            },

            bind: function(socket, call) {
                var buffer = '';
                return socket.on('data', (data) => {
                    buffer += data.toString();
                    var part = buffer.split(';'), packet = [], sub = 0, tmp = 0, buff = '';
                    for (let x in part) {
                        buff += part[x];
                        tmp += 1;
                        let json = $.json.parse(buff);
                        if (json) {
                            packet.push(json);
                            sub += buff.length + tmp;
                            tmp = 0;
                            buff = '';
                        }
                    }

                    call(packet);
                });
            }
        };

        return ({'private': obj});
    });
};
