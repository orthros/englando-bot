# englando-bot

Inspired by the `!englando` command on [Elajjaz's](https://www.twitch.tv/elajjaz) Twitch stream.

Elajjaz lives in Sweden, and streams for an international audeince regularly. Due to the number of languages spoken by his viewers, he has created an "english only" rule in chat. If users find people chatting in a language other than english, they can enter the `!englando` command which will cause [Nightbot](https://beta.nightbot.tv/) to say :

```
englando in chat, pls FeelsBlyatMan
```

Inspired by this, I thought with some decent data sanaization, a list of most commonly used words, and some help from Google, we could write a bot to detect if a user is speaking a language other than English, and notify them.

## Challenges 

There are two main hurdles to overcome when writing this bot

1. There are a number of Emotes in twitch that are not recognizeable English words
2. Google Translate API costs by the character 

## Getting Started

This application uses several environment variables for configuration

| Variable   | Use  | Required? |
|------------|------|-----------|
|TWITCH_CHANNEL| The name of the Channel on Twitch to join | Yes |
|TWITCH_NICK| The nickname to present in the chatroom. | Yes |
|TWITCH_TOKEN| The OAUTH API Key for authenticating to Twitch | Yes |
|GOOGLE_API_KEY| Google Authentication token to the API Services for Language Detection  | No |

## DotEnv

For developer convience this application uses [dotenv](https://www.npmjs.com/package/dotenv) which allows users to define a text file to set environment variables. See the `.env.example` file for the 

## Generating Twitch OAUTH Token

Follow the instructions found [here](https://help.twitch.tv/customer/portal/articles/1302780-twitch-irc).

## Generating Google Translate API Keys

If you want to use Google Translate API follow their guide to setting up keys [here](https://cloud.google.com/translate/docs/getting-started).

## Process 
With that in mind, the strategy is the following:

1. Get a list of all the emotes available in Twitch
2. Get a list of all the emotes in BetterTwitchTV
3. Get a list of the top 10k used English words
4. Upon recieving a message
    1. Strip out the username mentions
    2. Strip out the emotes
    3. Strip out the words that are not in the top 10k English words
    4. Check the total number of non top English words v.s. the total length of the message
    5. If configured, ask Google language detection api to guess the language
5. If the detected language is not English, warn the user

So the message 
```
lul @day9tv Google Translate Rocks kappa
```
would go through the following transformations:

1. Remove @username mentions

```
lul Google Translate Rocks kappa
```

2. Remove emotes
```
Google Translate Rocks
```

3. Remove Top 10k English words
```
Google
```

Since there is only one word in the message that is not in the top 10k then we would do nothing. Otherwise we would have sent  `Google` off to the language detection api and continued processing from there

## Areas for Improvement
[ ] Adaptive algorythm that will take the data returned from Google and if english, add the words to another "whitelist"

[ ] An extra "internet slang" dictionary to weed out other common words

[ ] Update the README more