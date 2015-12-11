# node-slack-pizza-bot
Node.js Express based bot for Slack

Meant to be published to Heroku, or similar service.

Uses [node-dominos-pizza-api](https://github.com/RIAEvangelist/node-dominos-pizza-api).

Set up a Slack slash command to POST to https://[heroku url]/api/slack [here](http://www.slack.com/services/new/slash-commands)
Set up a Slack bot integration to send periodic responses to a channel [here](https://www.slack.com/services/new/bot)

Set some env variables to configure the bot.
```
heroku config:set SLACK_BOT_TOKEN=<bot token>
heroku config:set SLACK_SLASH_TOKEN=<slash token>
heroku config:set SLACK_REPLY_CHANNEL=#channel
```

## Commands

```
/pizzabot [command: track, find] [arg]

  track [phone number] - in the format of 1234567890[+000]
    where 123 is area code, 4567890 is the phone number and 000 is the extension
    the order will be tracked and future changes to the order posted to the reply channel
    
  find [zip] - in the format of 12345
    Locates the nearest store to the zip specified
```
