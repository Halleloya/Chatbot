'use strict';
// Close dialog with the customer, reporting fulfillmentState of Failed or Fulfilled ("Thanks, your pizza will arrive in 20 minutes")
var slots;
var Location;
var Cuisine;
var NumPeople;
var DiningTime;
var PhoneNum;

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}
function closedining(sessionAttributes, fulfillmentState, message) {
    var AWS = require('aws-sdk');
    // Set the region 
    AWS.config.update({region: 'us-east-1'});
    
    // Create an SQS service object
    var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
    var ms = {"Location":Location, "Cuisine":Cuisine, "NumPeople":NumPeople, "DiningTime":DiningTime, "PhoneNum":PhoneNum};
    var mstosend = JSON.stringify(ms)
    var params = {
        DelaySeconds: 10,
        MessageAttributes: {
        "Title": {
        DataType: "String",
        StringValue: "The Whistler"
        },
        "Author": {
        DataType: "String",
        StringValue: "John Grisham"
        },
        "WeeksOn": {
        DataType: "Number",
        StringValue: "6"
        }
        },
        MessageBody: mstosend,
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/QUEUEURL"
    };
    
    sqs.sendMessage(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data.MessageId);
      }
    });
    
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}
 
// --------------- Events -----------------------
 
function dispatch(intentRequest, callback) {
    console.log(`request received for userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);
    const sessionAttributes = intentRequest.sessionAttributes;
    slots = intentRequest.currentIntent.slots;
    Location = slots.Location;
    Cuisine = slots.Cuisine;
    NumPeople = slots.NumPeople;
    DiningTime = slots.DiningTime;
    PhoneNum = slots.PhoneNum;
    
    if (intentRequest.currentIntent.name == "GreetingIntent") {
        callback(close(sessionAttributes, 'Fulfilled',
        {'contentType': 'PlainText', 'content': `Hi there, how can I help?`}));
    }
    if (intentRequest.currentIntent.name == "ThankYouIntent") {
        callback(close(sessionAttributes, 'Fulfilled',
        {'contentType': 'PlainText', 'content': `My Pleasure`}));
    }
    
    if (intentRequest.currentIntent.name == "DiningSuggestionsIntent") {
        callback(closedining(sessionAttributes, 'Fulfilled',
        {'contentType': 'PlainText', 'content': `Okay, Please wait for a second, I will send a message to your phone.`}));
    }
}
 
// --------------- Main handler -----------------------
 
// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        dispatch(event,
            (response) => {
                callback(null, response);
            });
    } catch (err) {
        callback(err);
    }
};