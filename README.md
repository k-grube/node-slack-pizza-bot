# node-slack-pizza-bot
Node.js express based bot for Slack

Meant to be published to Heroku, or local.  

Uses [node-dominos-pizza-api](https://github.com/RIAEvangelist/node-dominos-pizza-api).

Set up a Slack slash command to POST to https://[url]/api/slack

Set env SLACK_TOKEN for a Slack bot that sends responses to your channel. 


## Commands

```
/pizzabot [command: track, find, order] [arg]

  track [phone number] - in the format of 1234567890[+000]
    where 123 is area code, 4567890 is the phone number and 000 is the extension
    
  find [zip] - in the format of 12345
    Locates the nearest store to the zip specified
```
