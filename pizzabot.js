/**
 * Created by Kevin on 12/6/2015.
 */
var Slack = require('slack-node'),
    request = require('request'),
    Q = require('q'),
    pizzapi = require('dominos');

var apiToken = process.env.SLACK_TOKEN,
    slack = new Slack(apiToken);

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
     * @returns {Promise<T>}
     */
    route: function (body) {
        var deferred = Q.defer();

        var args = body.text.split(' ');

        if (args.length < 2) {
            deferred.reject(pizzabot.usage(body));
        } else {
            var command = args[0];

            if (command.match(/^track|^find/)) {
                pizzabot[command](body, args[1], function (data) {
                    deferred.resolve(data);
                });

            } else {
                deferred.reject(pizzabot.usage(body));
            }
        }

        return deferred.promise;
    },

    track: function (body, phone, callback) {

        return pizzapi.Track.byPhone(phone,
            /**
             *
             * @param {{}} result
             * @param {{}} result.orders
             * @param {[{}]} result.orders.OrderStatus
             * @param {string} result.orders.OrderStatusDriverName
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
                //order returned
                if (result.orders.OrderStatus.length > 0) {
                    var pizzaStatus = "";
                    if (result.orders.OrderStatus.length == 1) {
                        pizzaStatus = "Order status: " + result.orders.OrderStatus[0].OrderStatus + "\r\n";
                        pizzaStatus += "Order description: " + result.orders.OrderStatus[0].OrderDescription + "\r\n";
                    } else {
                        for (var i = 0; i < result.orders.OrderStatus; i++) {
                            pizzaStatus += "Order #" + (i + 1) + " - status: " + result.orders.OrderStatus[i].OrderStatus + "\r\n";
                            pizzaStatus += "Order #" + (i + 1) + " - description: " + result.orders.OrderStatus[i].OrderDescription + "\r\n";
                        }
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
                            + "\r\nAddress: " + results.result.Stores[0].AddressDescription
                            + "\r\nOpen for delivery? " + results.result.Stores[0].ServiceIsOpen.Delivery;


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

    queue: function () {

    },

    usage: function (body) {
        var message = {
            text: "```/pizzabot [command: track, find, order] [arg]\r\n" +
            "track [phone number] - in the format of 1234567890[+000]\r\n" +
            "where 123 is area code, 4567890 is the phone number and 000 is the extension\r\n" +
            "find [zip] - in the format of 12345\r\n" +
            "Locates the nearest store to the zip specified```",
            response_type: "ephemeral"
        };
        return message;
        //pizzabot.send(body, message);
    },

    send: function (body, message) {
        message.username = 'pizzabot';

        request.post(body.response_url, message, function (err, httpResponse, body) {
            console.log('err', err, 'httpResponse', httpResponse, 'body', body);
        });

        /*
         slack.api('chat.postMessage', message, function (err, response) {
         console.log('err', err, 'response', response);
         });
         */
    }
};

module.exports = pizzabot;