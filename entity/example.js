"use strict";

module.exports = function($) {
    return $.require([
        'module!entity/gossip.js'
    ], function(
        gossip
    ) {

        return ({'private': {}}); // don't want to run this if we load this module
		
        var a = new gossip({
            ip: '127.0.0.1',
            port: 9000,
            node: true,
            relay: function() {
                return true;
            }
        });
        a.on('message', function(data) {
            //console.log('master message got', a.who(), data);
        });

        const message = {}, client = {}, acl = [], max = 100;
        for (var i = 0; i < max; i++) {
            (function () {
                let t = new gossip({
                    ip: '127.0.0.1',
                    port: 9001 + i,
                    node: true,
                    seed: ['127.0.0.1:9000', '127.0.0.1:' + (9000 + i), '127.0.0.1:' + (9000 + Math.floor(Math.random() * max))]
                });
                acl.push(t);
                client[t.who()] = t;
                message[t.who()] = false;
                t.on('message', function(data) {
                    message[t.who()] = true;
                });
            })();
        }
        var wrong = [];
        for (var i = 0; i < 10; i++) {
            (function () {
                let t = new gossip({
                    ip: '127.0.0.1',
                    port: 9011 + i + max,
                    node: true,
                    shard: 'egg',
                    seed: ['127.0.0.1:9000', '127.0.0.1:' + (9000 + Math.floor(Math.random() * max))]
                });
                wrong.push(t);
                t.on('message', function(data) {
                    console.log('master message got', a.who(), data);
                });
            })();
        }


        const test = () => {
            for (var i in message) {
                message[i] = false;
            }
            const cl = acl[Math.floor(Math.random() * acl.length)];
            if (cl) {
                cl.send({
                    who: cl.who(),
                    cat: 'reg',
                    count: 10
                });

                let tick = 0;
                const loop = () => {
                    console.log('------------------');
                    let p = 0, c = 0;
                    for (var i in message) {
                        p += (message[i] ? 1 : 0);
                        c += 1;
                    }
                    console.log('message coverage', p, c);
                    var connected = {};
                    var scan = function(ip) {
                          if (client[ip]) {
                              const peer = client[ip].get();
                              for (var i in peer) {
                                  if (client[peer[i]] && !connected[peer[i]]) {
                                      connected[peer[i]] = true;
                                      scan(peer[i]);
                                  }
                              }
                          }
                    };
                    const ip = '127.0.0.1:' + (9000 + Math.floor(Math.random() * max));
                    scan(ip);
                    let cCount = 0;
                    for (var i in message) {
                        cCount += (message[i] ? 1 : 0);
                    }
                    if (client[ip]) {
                        console.log('socket chain', client[ip].get(), ip, cCount, max);
                    }
                    console.log('master connected', a.get().length);

                    const cl = acl[Math.floor(Math.random() * acl.length)];
                    if (cl) {
                        cl.send({
                            who: cl.who(),
                            cat: 'reg',
                            count: 10
                        });
                    }
                    setTimeout(function() {
                        if (p == c) {
                            console.log('message sent in ', tick);
                            test();
                        } else {
                            tick += 1;
                            loop();
                        }
                    }, 5000);
                };
                loop();
            } else {
                console.log('loop test');
                setTimeout(function() {
                    test();
                }, 1000);
            }
        };
        test();

        a.on('update_peer', function(data) {
            //console.log(data, data.length);
        });

		//------------------------------------------------------------------------------
		
        const config = $.config.get('gossip');

        const r = config.remote.split(':');
        const node = new gossip({
            ip: r[0],
            port: r[1],
            node: true,
            //debug: gossip.debug,
            seed: config.seed
        });
        node.on('message', function(data) {
            if (config.debug) {
                console.log('master message got', node.who(), data.packet());
            }
            data.relay();
        });
        node.on('connection', function(data) {
            console.log('peer', data);
        });
        node.on('error', function(err) {
            console.log('error', err);
        });

        console.log(config);

        let count = 0;
        const message = () => {
            node.send({
                who: node.who(),
                cat: 'reg',
                count: (count++)
            });
            setTimeout(function() {
                console.log('send');
                message();
            }, 1000);
        };
        if (config.message) {
            message();
        }
    });
};
