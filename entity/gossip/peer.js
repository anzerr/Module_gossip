"use strict";

module.exports = function ($) {
    return $.require([
        'module!entity/gossip/util/base.js',
        'node!net',
        'core!think'
    ], function (
        base,
        net,
        think
    ) {

        var obj = function(core, seed) {
            base.init(this);
            this._core = core;

            this._open = 0;
            this._queue = [];
            this.address = {};
            this.socket = {};
            this.seed = seed;
            this.think = new think(() => {
                for (let i in this.seed) {
                    if (this.socket[this.seed[i]]) {
                        let connected = false;
                        for (let x in this.socket[this.seed[i]]) {
                            if (this.socket[this.seed[i]][x] && !this.socket[this.seed[i]][x].destroyed) {
                                connected = true;
                                break;
                            }
                        }
                        if (!connected) {
                            this.connect(this.seed[i], 3)
                        }
                    } else {
                        this.connect(this.seed[i], 3)
                    }
                }

                if (this._open == 0) {
                    return;
                }

                const key = [], socket = {};
                for (let i in this.socket) {
                    key.push(i);
                    if (!$.is.array(socket[i])) {
                        socket[i] = [];
                    }
                    for (var x in this.socket[i]) {
                        if (this.socket[i][x]) {
                            socket[i].push(this.socket[i][x]);
                        }
                    }
                }

                const open = this._open - (this.seed.length);
                if (open < this._core.config.max) {
                    const p = [];
                    for (let i in this.address) {
                        if (!$.is.got(i, key)) {
                            p.push(i);
                        }
                    }
                    if (p.length != 0) {
                        const addr = p[this.random(p.length)];
                        this.connect(addr, 3);
                    }
                }

                const now = $.time.now().get;
                let i = 0;
                while (this._queue[i]) {
                    let q = this._queue[i];
                    if (q.time > now && (q.failed || 0) < 3) {
                        i++
                    } else {
                        this._queue.splice(i, 1);
                    }
                }

                const k = key[this.random(key.length)];
                if (k && socket[k] && socket[k].length != 0) {
                    this.send(socket[k][this.random(socket[k].length)], this.protocol().create('get_peer', {
                        shard: this._core.config.shard
                    }));
                }
            }, (10 + (5 * Math.random())) * 1000);
            this.reconnect();
        };
        obj.prototype = $.extends(base, {
            add: function(remote, socket) {
                if (socket && socket.__key) {
                    return ($.promise().resolve());
                }
                this.address[remote] = (this.address[remote] || 0) + 1;

                if (!this.socket[remote]) {
                    this.socket[remote] = {};
                }

                var key = $.key.short(), r = remote.split(':'), p = new $.promise(), done = false;
                if (!$.defined(socket)) {
                    socket = new net.Socket();
                    socket.__key = remote + '.' + key;
                    socket.__removed = false;
                    this.socket[remote][key] = socket;
                    if (!socket.__removed) {
                        this._open++;
                    }

                    this.log('connecting to ', r);

                    this.protocol().bind(socket, (packet) => {
                        for (var i in packet) {
                            this.protocol().route(packet[i], this, socket);
                        }
                    }).on('close', () => {
                        this.remove(remote, key);
                    }).on('error', (err) => {
                        this.emit('error', {remote: remote, err: err});
                        this.remove(remote, key);
                        if (!done) {
                            done = true;
                            p.reject(err);
                        }
                    });

                    socket.connect(r[1], r[0], () => {
                        var c = this._core.config;
                        this.emit('connection', {add: remote});
                        this.flush(remote);
                        if (c.node) {
                            this.sendAll(this.protocol().create('new_peer', {
                                remote: c.ip + ':' + c.port,
                                shard: c.shard
                            }));
                        }
                        if (!done) {
                            done = true;
                            p.resolve();
                        }
                        this.log('connected to ', r);
                    });
                } else {
                    socket.__key = remote + '.' + key;
                    socket.__removed = false;
                    if (!socket.__removed) {
                        this._open++;
                    }

                    this.socket[remote][key] = socket;
                    this.emit('connection', {add: remote});
                    this.flush(remote);

                    this.protocol().bind(socket, (packet) => {
                        for (var i in packet) {
                            this.protocol().route(packet[i], this, socket);
                        }
                    }).on('close', () => {
                        this.remove(remote, key);
                    }).on('error', (err) => {
                        this.emit('error', {remote: remote, err: err});
                        this.remove(remote, key);
                    });
                    p.resolve();
                }

                return (p);
            },

            flush: function(remote) {
                this.log('flush', remote);
                const now = $.time.now().get;
                let i = 0;
                while (this._queue[i]) {
                    let q = this._queue[i];
                    this.log('queue', q.remote, remote);
                    if (q.remote == remote) {
                        if (q.life > now && (q.failed || 0) < 3) {
                            ((q) => {
                                this.log('queue valid', q);
                                this.sendRemote(q.remote, q.socket || [], q.data, true).then((sent) => {
                                    if (!sent) {
                                        q.failed = (q.failed || 0) + 1;
                                        this._queue.push(q);
                                    }
                                });
                            })(this._queue.splice(i, 1)[0]);
                        } else {
                            this.log('queue dead', q.life, now, (q.failed || 0), (q.life > now), (q.failed || 0) < 3);
                            this._queue.splice(i, 1);
                        }
                    } else {
                        i++
                    }
                }
            },

            reconnect: function() {
                var wait = [];
                for (let i in this.seed) {
                    wait.push(this.connect(this.seed[i], 3));
                }
                return $.all(wait);
            },

            connect: function(ip, retry) {
                if (retry < 0) {
                    return $.promise().resolve();
                }

                return this.add(ip).then(() => {
                    return true;
                }, () => {
                    var p = new $.promise();

                    setTimeout(() => {
                        this.connect(ip, retry - 1).then((r) => {
                            p.resolve(r);
                        }, (e) => {
                            p.reject(e);
                        })
                    }, 1000);

                    return p;
                });
            },

            remove: function(a, b) {
                if (this.socket[a][b]) {
                    var c = ['close', 'error', 'data'];
                    for (var i in c) {
                        this.socket[a][b].removeAllListeners(c[i]);
                    }
                    if (!this.socket[a][b].__removed) {
                        this._open--;
                        this.socket[a][b].__removed = true;
                    }
                }
                this.emit('connection', {remove: a});
                this.socket[a][b] = null;
                return this;
            },

            get: function() {
                var s = [];
                for (let i in this.socket) {
                    s.push(i);
                }
                return s;
            },

            send: function(socket, packet) {
                if (socket) {
                    var p = new $.promise();

                    socket.write((($.is.string(packet))? packet : $.json.encode(packet)) + ';', function(err) {
                        p.resolve($.defined(err));
                    });

                    return p;
                } else {
                    this.log('missing socket to write on', socket, packet);
                    return $.promise().resolve(false);
                }
            },

            sendRemote: function(remote, socket, packet, skip) {
                const p = $.json.encode(packet), wait = [];
                let sent = false;
                for (let x in this.socket[remote]) {
                    if (this.socket[remote][x] && $.is.not(this.socket[remote][x], socket) && !this.socket[remote][x].destroyed) {
                        wait.push(this.send(this.socket[remote][x], p).then((r) => {
                            if (!sent) {
                                sent = r;
                            }
                            return (r);
                        }));
                    }
                }
                return $.all(wait).then(() => {
                    this.log('sendRemote', remote, sent);
                    /*if (!sent && !skip) {
                        this._queue.push({
                            remote: remote,
                            data: packet,
                            life: $.time.now().minute(5).get
                        });
                    }*/
                    return (sent);
                });
            },

            sendOther: function(socket, packet) {
                const wait = [];
                for (let i in this.socket) {
                    ((i) => {
                        wait.push(this.sendRemote(i, socket, packet));
                    })(i);
                }
                return $.all(wait).then((r) => {
                    return r;
                });
            },

            sendAll: function(packet) {
                return this.sendOther([], packet);
            }
        });

        return ({'private': obj});
    });
};
