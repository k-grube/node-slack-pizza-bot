/**
 * Created by Kevin on 12/6/2015.
 */
var Slack = require('slack-node'),
    request = require('request'),
    Q = require('q'),
    pizzapi = require('dominos');

var DEFAULT_UPDATE_TIMER = 60000;

var apiToken = process.env.SLACK_TOKEN,
    slack = new Slack(apiToken);

/**
 *
 * @type {{route: Function, track: Function, find: Function, queue: {add: pizzabot.queue.add, contains: pizzabot.queue.contains, start: pizzabot.queue.start, stop: pizzabot.queue.stop, remove: pizzabot.queue.remove}, usage: Function, send: Function}}
 */
var pizzabot = {

    /**
     * @typedef {Object} body
     * @param body
     * @param body.token
     * @param body.team_id
     * @param body.team_domain
     * @param body.channel_id
     * @param body.channel_name
     * @param body.user_id
     * @param body.user_name
     * @param body.command
     * @param body.text
     * @param body.response_url
     * @returns {*}
     */
    route: function (body) {
        var deferred = Q.defer();

        var args = body.text.split(' ');

        if (args.length < 2) {
            deferred.reject(pizzabot.usage());
        } else {
            var command = args[0];

            if (command.match(/^track|^find/)) {
                pizzabot[command](body, args[1], function (data) {
                    deferred.resolve(data);
                });

            } else {
                deferred.reject(pizzabot.usage());
            }
        }

        return deferred.promise;
    },

    track: function (body, phone, callback) {

        return pizzapi.Track.byPhone(phone,
            /**
             *
             * @param {{}} result
             * @param {boolean} result.success
             * @param {{}} result.orders
             * @param {Object[]} result.orders.OrderStatus
             * @param {string} result.orders.OrderStatus.DriverName
             * @param {string} result.orders.OrderStatus.OrderDescription
             * @param {string} result.orders.OrderStatus.OvenTime
             * @param {string} result.orders.OrderStatus.StartTime
             * @param {string} result.orders.OrderStatus.RackTime
             * @param {string} result.orders.OrderStatus.OvenTime
             * @param {string} result.orders.OrderStatus.OrderStatus
             * @param {{}} result.query
             * @param {string} result.query.Phone
             */
            function (result) {
                console.log(result);
                if (result.success) {
                    //order returned
                    if (result.orders.OrderStatus.length > 0) {
                        var pizzaStatus = "";
                        for (var i = 0; i < result.orders.OrderStatus.length; i++) {
                            var orderStatus = result.orders.OrderStatus[i].OrderStatus;
                            pizzaStatus += "Order #" + (i + 1) + " - status: " + orderStatus + "\r\n";
                            pizzaStatus += "Order #" + (i + 1) + " - description: " + orderStatus + "\r\n";

                            /*
                            if (!pizzabot.queue.contains(phone) && orderStatus !== 'Completed') {
                                pizzabot.queue.add(phone, body, orderStatus, i);
                            }
                            if (pizzabot.queue.contains(phone) && orderStatus === 'Completed') {
                                pizzabot.queue.remove(phone);
                            }*/
                        }

                        callback({
                            text: pizzaStatus,
                            response_type: "in_channel"
                        });
                    } else {
                        callback({
                            text: "No orders found.",
                            response_type: "in_channel"
                        });
                    }
                } else {
                    callback({
                        text: "No orders found.",
                        response_type: "in_channel"
                    });
                }
            });
    },

    find: function (body, zip, callback) {
        pizzapi.Util.findNearbyStores(
            zip, 'delivery',
            /**
             *
             * @param results
             * @param results.success
             * @param results.result
             * @param {[{}]} results.Stores
             * @param results.Stores.AddressDescription
             * @param {boolean} results.Stores.IsOpen
             * @param {{}} results.Stores.ServiceIsOpen
             * @param {boolean} results.Stores.Service.ServiceIsOpen.Carryout
             * @param {boolean} results.Stores.Service.ServiceIsOpen.Delivery
             * @param results.Stores.LocationInfo
             * @param results.Stores.Phone
             * @param results.Stores.StoreID
             * @param results.Stores.HoursDescription
             */
            function (results) {
                if (results.success) {
                    if (results.result.Stores.length > 0) {
                        var message = "```Best Match:"
                            + "\r\nStoreID: " + results.result.Stores[0].StoreID
                            + "\r\nPhone: " + results.result.Stores[0].Phone
                            + "\r\nAddress: " + results.result.Stores[0].AddressDescription
                            + "\r\nOpen for delivery? " + results.result.Stores[0].ServiceIsOpen.Delivery
                            + "```";


                        callback({
                            text: message,
                            response_type: 'in_channel'
                        });
                    } else {
                        callback({
                            text: 'No stores found.',
                            response_type: 'in_channel'
                        });
                    }
                } else {
                    callback({
                        text: 'No stores found.',
                        response_type: 'in_channel'
                    });
                }

            }
        );
    },

    /**
     * queue singleton, not a queue in the data structure sense.
     * queues the tracked orders so updates can be sent back to slack.
     */
    queue: (/**
     *
     * @returns {{add: pizzabot.queue.add, contains: pizzabot.queue.contains, start: pizzabot.queue.start, stop: pizzabot.queue.stop, remove: pizzabot.queue.remove}}
     */
        function () {
        var self = this;
        self.queue = {};

        return {
            /**
             * Add the order to the queue
             * @param phone
             * @param body
             * @param lastStatus
             * @param sequenceNumber
             */
            add: function (phone, body, lastStatus, sequenceNumber) {
                if (typeof self.queue[phone] === 'undefined') {
                    self.queue[phone] = [];
                }
                self.queue[phone][sequenceNumber] = {
                    body: body,
                    phone: phone,
                    lastStatus: lastStatus,
                    sequenceNumber: sequenceNumber
                };
                console.log('add queue', phone);
                self.stop();
                self.start();
            },
            /**
             * Is the order being tracked?
             * @param phone
             * @param sequenceNumber
             * @returns {boolean}
             */
            contains: function (phone, sequenceNumber) {
                if (typeof sequenceNumber === 'undefined') {
                    sequenceNumber = 0;
                }

                return typeof self.queue[phone] !== 'undefined' && self.queue[phone].sequenceNumber == sequenceNumber;

            },
            /**
             * start intervals to periodically check the API for updates
             */
            start: function () {
                pizzabot.queue.stop();
                for (var q in self.queue) {
                    if (self.queue.hasOwnProperty(q)) {
                        self.queue[q].interval = setInterval(function (t) {
                            
                            pizzabot.track(t.body, t.phone, function(){

                            });
                            
                            pizzapi.Track.byPhone(t.phone, function (result) {
                                if (result.success) {
                                    if (result.orders.OrderStatus.length > 0) {
                                        for (var i = 0; i < result.orders.OrderStatus.length; i++) {
                                            
                                        }
                                    } else {
                                        if (self.queue.contains(t.phone)) {

                                        }
                                    }
                                } else {

                                }
                            });
                        }, DEFAULT_UPDATE_TIMER, self.queue[q]);
                    }
                }
            },
            /**
             * clear all intervals
             */
            stop: function () {
                for (var i in self.queue) {
                    if (self.queue.hasOwnProperty(i)) {
                        clearInterval(self.queue[i].interval);
                    }
                }
                console.log('intervals cleared');
            },
            /**
             * remove order from queue
             * @param phone
             */
            remove: function (phone) {
                delete self.queue[phone];
                self.stop();
                self.start();
                console.log('remove queue', phone);
            }
        }
    })(),

    /**
     * generate usage string
     * @returns {{text: string, response_type: string}}
     */
    usage: function () {
        var message = {
            text: "```/pizzabot [command: track, find, order] [arg]\r\n" +
            "  track [phone number] - in the format of 1234567890[+000]\r\n" +
            "    where 123 is area code, 4567890 is the phone number and 000 is the extension\r\n" +
            "  find [zip] - in the format of 12345\r\n" +
            "    locates the nearest store to the zip specified```",
            response_type: "ephemeral"
        };
        return message;
    },

    /**
     * send message via POST from slash command to channel
     * @param body
     * @param message
     */
    send: function (body, message) {
        message.username = 'pizzabot';

        request.post(body.response_url, message, function (err, httpResponse, body) {
            console.log('pizzabot send', 'err', err, 'httpResponse', httpResponse, 'body', body);
        });
    },
    /**
     * use slack-node API to send message, requires SLACK_TOKEN env variable be set
     * @param body
     * @param message
     */
    sendAPI: function (body, message) {

        slack.api('chat.postMessage', message, function (err, response) {
            console.log('pizzabot sendAPI', 'err', err, 'response', response);
        });

    }
};

module.exports = pizzabot;