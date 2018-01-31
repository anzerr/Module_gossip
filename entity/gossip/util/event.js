"use strict";

module.exports = function ($) {
    return $.require([
        'node!events'
    ], function (
        events
    ) {

        const key = '__' + $.key.short();

        const obj = function() { };
        obj.prototype = {
            emit: function() {
                this[key].emit.apply(this[key], arguments);
                return this;
            },
            on: function() {
                this[key].on.apply(this[key], arguments);
                return this;
            },

            once: function(e) {
                var p = new $.promise();

                this[key].once(e, function(d) {
                    p.resolve(d);
                });

                return (p);
            }
        };
        obj.init = function(a) {
            a[key] = new events();
        };

        return ({'private': obj});
    });
};
