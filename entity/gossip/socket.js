"use strict";

module.exports = function ($) {
    return $.require([
        //
    ], function (
        //
    ) {

        const obj = function(peer, data) {
            this._peer = peer;
            this._data = data;
        };
        obj.prototype = {
            all: function() {
                return this._peer.sendAll(this._data);
            },

            address: function(remote) {
                if ($.is.array(remote)) {
                    const wait = [];
                    for (let i in remote) {
                        wait.push(this._peer.sendRemote(remote[i], null, this._data));
                    }
                    return $.all(wait);
                }
                return this._peer.sendRemote(remote, null, this._data);
            }
        };

        return ({'private': obj});
    });
};
