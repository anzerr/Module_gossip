"use strict";

module.exports = function ($) {
    return $.require([
        //
    ], function (
        //
    ) {

        const obj = function() {};
        obj.prototype = {
            random: function(n) {
                return Math.floor(Math.random() * n);
            },

            on: function(handle, event, cd) {
                for (var i in handle) {
                    handle[i].on(event, cd);
                }
            },

            mapOn: function(handle, map) {
                for (let i in map) {
                    this.on(handle, i, map[i]);
                }
            }
        };

        return ({'static private': obj});
    });
};
