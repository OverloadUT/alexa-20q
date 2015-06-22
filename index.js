require('dotenv').load();
var request = require('request');
var cheerio = require('cheerio');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);
        console.log("amzn1.echo-sdk-ams.app." + process.env.ALEXA_APP_ID);

        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app." + process.env.ALEXA_APP_ID) {
            context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);

            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
                ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the app without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
                ", sessionId=" + session.sessionId);

    startGame(callback);
}

/** 
 * Called when the user specifies an intent for this application.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
                ", sessionId=" + session.sessionId +
                ", intentName=" + intentRequest.intent.intentName);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    var sessionAttributes = session.attributes;

    if(typeof sessionAttributes !== 'undefined') {
        // We have a game going

        // questionType can be "first", "question", or "guess"
        if(sessionAttributes.questionType == 'first') {
            // The first question asks for what kind of thing it is
            if ("AnimalIntent" === intentName) {
                processAnswer('Animal', session, callback);
            } else if ("VegetableIntent" === intentName) {
                processAnswer('Vegetable', session, callback);
            } else if ("MineralIntent" === intentName) {
                processAnswer('Mineral', session, callback);
            } else if ("ConceptIntent" === intentName) {
                processAnswer('Concept', session, callback);
            } else if ("UnknownIntent" === intentName) {
                processAnswer('Unknown', session, callback);
            } else {
                invalidAnswer(session, callback);
            }
        } else if (sessionAttributes.questionType == 'question') {
            if ("YesIntent" === intentName) {
                processAnswer('Yes', session, callback);
            } else if ("NoIntent" === intentName) {
                processAnswer('No', session, callback);
            } else if ("UnknownIntent" === intentName) {
                processAnswer('Unknown', session, callback);
            } else if ("IrrelevantIntent" === intentName) {
                processAnswer('Irrelevant', session, callback);
            } else if ("SometimesIntent" === intentName) {
                processAnswer('Sometimes', session, callback);
            } else if ("MaybeIntent" === intentName) {
                processAnswer('Maybe', session, callback);
            } else if ("ProbablyIntent" === intentName) {
                processAnswer('Probably', session, callback);
            } else if ("DoubtfulIntent" === intentName) {
                processAnswer('Doubtful', session, callback);
            } else if ("UsuallyIntent" === intentName) {
                processAnswer('Usually', session, callback);
            } else if ("DependsIntent" === intentName) {
                processAnswer('Depends', session, callback);
            } else if ("RarelyIntent" === intentName) {
                processAnswer('Rarely', session, callback);
            } else if ("PartlyIntent" === intentName) {
                processAnswer('Partly', session, callback);
            } else if ("RightIntent" === intentName) {
                processAnswer('Right', session, callback);
            } else if ("WrongIntent" === intentName) {
                processAnswer('Wrong', session, callback);
            } else if ("CloseIntent" === intentName) {
                processAnswer('Close', session, callback);
            } else {
                invalidAnswer(session, callback);
            }
        }

    } else {
        startGame(callback);
    }

}

/**
 * Called when the user ends the session.
 * Is not called when the app returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
                ", sessionId=" + session.sessionId);
}

/**
 * Helpers that build all of the responses.
 */
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "20Q - " + title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    console.log('buildReponse "'+speechletResponse.outputSpeech.text+'"');
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function unknownAnswer(session, callback) {
    var sessionAttributes = session.attributes;

    var optionlist = buildNaturalLangList(Object.keys(sessionAttributes.options), 'or');

    var questiontext = "Sorry, I didn't understand the answer. " +
                        sessionAttributes.questionText +
                        " You can say " + optionlist + "";

    var repeattext = sessionAttributes.questionText +
                     " You can say " + optionlist + "";

    callback(sessionAttributes,
             buildSpeechletResponse("Invalid Answer", questiontext, repeattext, false));
}

function invalidAnswer(session, callback) {
    var sessionAttributes = session.attributes;

    var optionlist = buildNaturalLangList(Object.keys(sessionAttributes.options), 'or');

    var questiontext = "Sorry, that was not a valid answer. " +
                        sessionAttributes.questionText +
                        " You can say " + optionlist + "";

    var repeattext = sessionAttributes.questionText +
                     " You can say " + optionlist + "";

    callback(sessionAttributes,
             buildSpeechletResponse("Invalid Answer", questiontext, repeattext, false));
}

function processAnswer(answer, session, callback) {
    var sessionAttributes = session.attributes;

    if(sessionAttributes.options[answer] === undefined) {
        return invalidAnswer(session, callback);
    } else {
        var uri = sessionAttributes.options[answer];
        return askNextQuestion(uri, session, callback);
    }

}

function askNextQuestion(uri, session, callback) {
    var sessionAttributes = session.attributes;

    var reqoptions = {
        url: process.env.TWENTY_QUESTIONS_DATA_URL + uri,
        headers: {
            'Referer': process.env.TWENTY_QUESTIONS_DATA_URL + '/gsq-en'
        }
    };

    request(reqoptions, function(err, response, html){
        if (err) {
            console.log("Error requesting " + uri);
            console.log(err);
            return callback(sessionAttributes,
                            buildSpeechletResponse("App Error", "There was an error accessing the twenty questions website. Try repeating your answer.", "There was an error accessing the twenty questions. Try repeating your answer.", false));
        }

        var $;
        try {
            $ = cheerio.load(html);
        } catch (e) {
            console.log("Exception when trying to parse html with Cheerio.");
            console.log(e);
            console.log(html);
            return callback(sessionAttributes,
                            buildSpeechletResponse("App Error", "There was an error with the 20q website. Try repeating your question.", "There was an error with the 20q website. Try repeating your question.", false));
        }

        if($('h2').length > 0) {
            // There is only an h2 element on the game over screen.
            if($('h2').first().text() == "20Q won!") {
                return callback(sessionAttributes,
                                buildSpeechletResponse("20Q won!", "Woo hoo! I win!", "", true));
            } else {
                return callback(sessionAttributes,
                                buildSpeechletResponse("20Q lost!", "Alright, I give up!", "", true));
            }
        } else {
            var optionelements = $('big nobr a');

            sessionAttributes.options = {};
            for(var i = 0; i < optionelements.length; i++) {
                var optionname = $(optionelements[i]).text().replace(/(&nbsp;)/i,'').trim();
                var optionURI = $(optionelements[i]).attr('href');

                sessionAttributes.options[optionname] = optionURI;
            }

            // var question = $('big b').childNodes[0].nodeValue.replace(/(&nbsp;|\s)/i,'');
            var question = $('big b').text().split(/[\r\n]/)[0].replace(/(&nbsp;)/i,'').trim();

            sessionAttributes.questionType = 'question';
            sessionAttributes.questionNum += 1;
            sessionAttributes.questionText = question;

            var listtext = buildNaturalLangList(Object.keys(sessionAttributes.options), 'or');

            callback(sessionAttributes,
                buildSpeechletResponse("Question " + sessionAttributes.questionNum, question, question + " If you are unsure, you can say 'I don't know.'", false));
        }
    });
}

/** 
 * Start a new game
 */
function startGame(callback) {
    var sessionAttributes = {};

    var reqoptions = {
        url: process.env.TWENTY_QUESTIONS_DATA_URL + '/gsq-en',
        headers: {
            'Referer': process.env.TWENTY_QUESTIONS_HOME_URL + '/play.html'
        }
    };
    
    request(reqoptions, function(err, response, html){
        var $ = cheerio.load(html);
        var newgameuri = $('form').first().attr('action');

        var reqoptions = {
            url: process.env.TWENTY_QUESTIONS_DATA_URL + newgameuri,
            headers: {
                'Referer': process.env.TWENTY_QUESTIONS_DATA_URL + '/gsq-en'
            },
            form: {
                'age': '',
                'cctkr': 'US,MX,CA,KH',
                'submit': 'Play'
            }
        };

        request.post(reqoptions, function(err, response, html) {
            var $ = cheerio.load(html);
            var optionelements = $('big nobr a');

            sessionAttributes.options = {};
            for(var i = 0; i < optionelements.length; i++) {
                var optionname = $(optionelements[i]).text();
                var optionURI = $(optionelements[i]).attr('href');

                sessionAttributes.options[optionname] = optionURI;
            }

            var listtext = buildNaturalLangList(Object.keys(sessionAttributes.options), 'or');
            var startgamephrases = [
                'I will read your mind. ',
                'Prepare to be amazed. ',
                'I love this game. ',
                "20 Questions? I'll only need 10. "
            ];
            var startgametext = startgamephrases[randomInt(0,startgamephrases.length)];

            sessionAttributes.questionType = 'first';
            sessionAttributes.questionNum = 1;
            sessionAttributes.questionText = listtext + "?";

            callback(sessionAttributes,
                     buildSpeechletResponse("New Game", startgametext + listtext + "?", listtext + "?", false));
        });
    });

}

function buildNaturalLangList(items, finalWord) {
    var output = '';
    for(var i = 0; i<items.length; i++) {
        if(i === 0) {
            output += items[i];
        } else if (i < items.length-1) {
            output += ', ' + items[i];
        } else {
            output += ', ' + finalWord + ' ' + items[i];
        }
    }

    return output;
}

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}