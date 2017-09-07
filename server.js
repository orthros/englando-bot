var promisify = require("promisify-node");
var fs = promisify("fs");
var endOfLine = require('os').EOL;

const IRC = require('irc-framework');

const bot = new IRC.Client();

var commonEnglish = new Set();

var twitchEmotes = new Set();

var betterTtvEmotes = new Set();

//Promise to get the english file
var fileRead = fs.readFile("google-10000-english.txt").then(function (contents) {
    console.log("Most common english words read")
    contents = contents.toString("utf-8");
    contents = contents.split(endOfLine);
    commonEnglish = new Set(contents);
});

//TODO: Promise to get all the twitch emotes

//TODO: Promise to get all the BetterTTV Emotes

//Wait for us to read the english words, the twitch emotes and the better ttv emotes
Promise.all([fileRead]).then(function () {
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

            var message = event.message;
            //Remove all punctuation save for "@"
            message = message.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
            //Split the message by whitespace
            var words = message.split(" ");
            //Remove all words beginning with "@" as they are username mentions
            words = words.filter(function (word) {
                return word.charAt(0) != "@";
            });
            //Remove the emotes
            words = words.filter(function (word) {
                return !twitchEmotes.has(word);
            });
            //Then remove the better ttv emotes
            words = words.filter(function (word) {
                return !betterTtvEmotes.has(word);
            });

            //At this point it would be wise for us to remove the
            //words that are only digits of some kind

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