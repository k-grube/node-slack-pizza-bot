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
     * @returns {Deferred<T>}
     */
    route: function (body) {
        var deferred = Q.defer();

        var args = body.text.split(' ');

        if (args.length < 2) {
            this.usage(body);
            deferred.reject({err: 'invalid syntax'});
        } else {
            var command = args[0];

            deferred.resolve(pizzabot[command](body, args[1]));
        }

        return deferred;
    },

    track: function (body, phone) {

        pizzapi.Track.byPhone(phone,
            /**
             *
             * @param {{}} result
             * @param {{}} result.orders
             * @param {[{}]} result.orders.OrderStatus
             * @param {string} result.orders.OrderStatus[].DriverName
             * @param {string} result.orders.OrderStatus[].OvenTime
             * @param {string} result.orders.OrderStatus[].StartTime
             * @param {string} result.orders.OrderStatus[].RackTime
             * @param {string} result.orders.OrderStatus[].OvenTime
             * @param {string} result.orders.OrderStatus[].OrderStatus
             * @param {{}} result.query
             * @param {string} result.query.Phone
             */
            function (result) {
                var message = {
                    text: "Pizza status: " + result.orders.OrderStatus[0].OrderStatus,
                    response_type: "in_channel"
                };
                pizzabot.send(body, message);
            });
    },

    find: function (body) {
        pizzapi.Store.findNearbyStores();
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

        pizzabot.send(body, message);
    },

    send: function (body, message) {
        message.channel = body.channel_id;
        message.username = 'pizzabot';

        slack.api('chat.postMessage', message, function (err, response) {
            console.log('err', err, 'response', response);
        });
    }
};

/**
 *
 * @param data
 * @param data.token
 * @param data.team_id
 * @param data.team_domain
 * @param data.channel_id
 * @param data.channel_name
 * @param data.user_id
 * @param data.user_name
 * @param data.command
 * @param data.text
 * @param data.response_url
 */

module.exports = pizzabot;