require("dotenv").config();
const promisify = require("promisify-node");
const request = require("request-promise");
const fs = promisify("fs");
const endOfLine = require('os').EOL;

const IRC = require('irc-framework');

const bot = new IRC.Client();

var commonEnglish = new Set();

var twitchEmotes = new Set();

var betterTtvEmotes = new Set();

//Promise to get the english file
var fileReadPromise = fs.readFile("google-10000-english.txt").then(function (contents) {
    console.log("Most common english words read")
    contents = contents.toString("utf-8");
    contents = contents.split(endOfLine);
    commonEnglish = new Set(contents);
});

//Promise to get the Twitch global emotes
var globalTwitchEmotesPromise = request("https://twitchemotes.com/api_cache/v3/global.json").then(function (jsonBody) {
    var jdata = JSON.parse(jsonBody);
    var keyData = Object.keys(jdata);
    keyData.forEach(function (value) {
        twitchEmotes.add(value.toLowerCase());
    });
});
//Promise to get the Twitch Subscriber emotes
var subscriberTwitchEmotesPromise = request("https://twitchemotes.com/api_cache/v3/subscriber.json").then(function (jsonBody) {
    //So this WORKS but the jsonBody object is so large
    //JSON.parse hangs indefinately    
    //var jdata = JSON.parse(jsonBody);
    //A better solution might be to regex out for the 
    //  "emotes":[]
    //values and for each match, grab the emote code and add to the list
    var emotesReg = /{"id":\d+,"code":"([\w\d]+)","emoticon_set":\d+}/g;
    var emotesMatch;
    do {
        emotesMatch = emotesReg.exec(jsonBody);
        if (emotesMatch) {
            twitchEmotes.add(emotesMatch[1].toLowerCase());
        }
    } while (emotesMatch);
});
//Promise to get all the BetterTTV Global Emotes
var betterTTVEmotesPromise = request("https://api.betterttv.net/emotes").then(function (jsonBody) {
    //Once again we could json.parse this but looking at the response...
    //we could just look for the "regex" property of the json response and
    //add them that way
    //var objData = JSON.parse(jsonBody);
    var emoteReg = /"regex"\s*:\s*"([\w\d\(\)':&]+)"/g;
    var emoteMatch;
    do {
        emoteMatch = emoteReg.exec(jsonBody);
        if (emoteMatch) {
            betterTtvEmotes.add(emoteMatch[1].toLowerCase());
        }
    } while (emoteMatch);
});
//Promise to get all the BetterTTV Emotes for the current channel
var betterTTVChannelEmotesPromise = request("https://api.betterttv.net/2/channels/" + process.env.TWITCH_CHANNEL).then(function (jsonBody) {
    var emoteReg = /"code"\s*:\s*"([\w\d\(\)':&]+)"/g;
    var emoteMatch;
    do {
        emoteMatch = emoteReg.exec(jsonBody);
        if (emoteMatch) {
            betterTtvEmotes.add(emoteMatch[1].toLowerCase());
        }
    } while (emoteMatch);
}).catch(function (error) {
    //Just eat the 404 error.    
});

//Wait for us to read the english words, the twitch emotes and the better ttv emotes
Promise.all([fileReadPromise,
    globalTwitchEmotesPromise,
    subscriberTwitchEmotesPromise,
    betterTTVEmotesPromise,
    betterTTVChannelEmotesPromise])
    .then(function () {
        const digitReg = /^\d+$/;
        const emotesRegex = new RegExp("(" + [...twitchEmotes, ...betterTtvEmotes].join("|") + ")", 'g').compile();

        bot.connect({
            host: 'irc.chat.twitch.tv',
            port: 6667,
            nick: process.env.TWITCH_NICK,
            password: process.env.TWITCH_TOKEN
        });

        bot.on('registered', () => {
            console.log('registered on twitch irc!');
            const channel = bot.channel(process.env.TWITCH_CHANNEL);
            channel.join();

            //We'll match everything for now
            bot.matchMessage(new RegExp(), (event) => {
                //simple debug statement to let you know things are working
                console.log(event.nick + ': ' + event.message);
                //This would be an interesting place to put in a whitelist of nicks. 
                //Aka: wow that orthros_ guy is pretty funny && makes puns in other languages
                //     all the time, we should let him do non english phrases.

                let message = event.message;
                //Remove all the emotes first as some emotes can have punctuation
                message = message.replace(emotesRegex, "");
                //Remove all punctuation save for "@"
                message = message.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
                //Split the message by whitespace
                let words = message.split(" ");
                //Remove all words beginning with "@" as they are username mentions
                words = words.filter(function (word) {
                    return word.charAt(0) != "@";
                });

                //At this point it would be wise for us to remove the
                //words that are only digits of some kind                
                words = words.filter(function (word) {
                    return !digitReg.test(word);
                })

                //Here is a point for some optimization.
                //If we are at a point where we have < X words
                //and X is sufficiently low enough (ie 2)
                //do we really want to do any more processing on it?
                //This is clearly up for MUCH debate and we should err on the side of caution
                //but one could imagine a situation where someone simply utters 
                //     lulz rekd
                //That probably wont hit the emotes filter and is more than likely 
                //not in the top 10k english words
                //We may need to incorporate an english slang dictionary
                //For now we will leave this alone and leave it as a thought


                //Now go through all the words in the top 10k english words
                //And count how many there are that are NON english
                var nonEnglishWords = words.filter(function (word) {
                    return !commonEnglish.has(word.toLowerCase());
                });

                //If there are any non english we need to do some math
                if (nonEnglishWords.length > 0) {
                    //First we'll calculate the ratio of non english words to english words
                    var ratio = nonEnglishWords.length / words.length;

                    console.log(ratio);

                    //If the ratio is sufficently low (ie .1 or less) we can continue.
                    //Otherwise it might be nice to call out to the google language
                    //detection API.
                    //This costs 20$ for every million characters passed to it, which is why
                    //we are filtering out emotes etc to begin with
                }
            });
        });
    });