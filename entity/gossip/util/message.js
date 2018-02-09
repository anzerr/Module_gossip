"use strict";

module.exports = function ($) {
    return $.require([
        //
    ], function (
        //
    ) {

        const obj = function(core, packet) {
            this._core = core;
            this._packet = packet;
        };
        obj.prototype = {
            relay: function() {
                this._core.emit('relay_message', this._packet);
                return (this);
            },

            socket: function() {
                return (this._packet.socket);
            },

            packet: function() {
                return (this._packet.packet);
            },

            raw: function () {
                return (this._packet);
            }
        };

        return ({'private': obj});
    });
};
