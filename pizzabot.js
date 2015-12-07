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
     * @returns {Deferred<string>}
     */
    route: function (body) {
        var deferred = Q.defer();

        var args = body.text.split(' ');

        if (args.length > 2) {
            this.usage(body);
        } else {
            var command = args[1];

            this[command](args[2]);
        }

        return deferred;
    },

    track: function (body) {
        pizzapi.Track.byPhone()

    },

    find: function (body) {
        pizzapi.Track.byId()
    },

    queue: function () {

    },

    usage: function (body) {
        var message = {
            text: "pizzabot usage:\r\n```/pizzabot <command> <args>\r\n Commands:\r\n\ttrack <phone | id>```",
            response_type: "ephemeral"
        };

        this.send(body, message);
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