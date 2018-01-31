"use strict";

module.exports = function ($) {
    return $.require([
        'module!entity/gossip/util/protocol.js',
        'module!entity/gossip/util/event.js',
        'module!entity/gossip/util/util.js'
    ], function (
        protocol,
        event,
        util
    ) {

        const obj = function() {};
        obj.prototype = $.extends(event, {
            log: function() {
                if (this._core.config.debug) {
                    console.log.apply(this, arguments);
                }
            },

            protocol: function() {
                if (!this._core._protocol) {
                    this._core._protocol = new protocol(this._core);
                }
                return this._core._protocol;
            },
            random: function(n) {
                return util.random(n);
            }
        });
        obj.init = function() {
            return event.init.apply(event.init, arguments);
        };

        return ({'private': obj});
    });
};
