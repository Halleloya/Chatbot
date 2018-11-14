'use strict';
    

// Close dialog with the customer, reporting fulfillmentState of Failed or Fulfilled ("Thanks, your pizza will arrive in 20 minutes")
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

 
// --------------- Events -----------------------
 
function dispatch(intentRequest, callback) { 
    var AWS = require('aws-sdk');
    // Set the region 
    AWS.config.update({region: 'us-east-1'});

    // Create an SQS service object
    var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
    
    var queueURL = "https://sqs.us-east-1.amazonaws.com/YOURQUEUEURL";
    var params = {
        AttributeNames: [
        "SentTimestamp"
        ],
        MaxNumberOfMessages: 1,
        MessageAttributeNames: [
        "All"
        ],
        QueueUrl: queueURL,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0
    };
    
    const sessionAttributes = intentRequest.sessionAttributes;
    
    var Location;
    var Cuisine;
    var NumPeople;
    var DiningTime;
    var PhoneNum;
    var req;
    var res = {};
    
    sqs.receiveMessage(params, function(err, data) {
      if (err) {
        console.log("Receive Error", err);
      } else if (data.Messages) {
        var deleteParams = {
          QueueUrl: queueURL,
          ReceiptHandle: data.Messages[0].ReceiptHandle
        };
        //var reply = JSON.parse(data.Messages[0].Body);
        //console.log("data.Messages[0].Body= ", data.Messages[0].Body);
        //console.log(typeof(data.Messages[0].Body));
        var reply = JSON.parse(data.Messages[0].Body);
        Location = reply.Location;
        Cuisine = reply.Cuisine;
        NumPeople = reply.NumPeople;
        DiningTime = reply.DiningTime;
        PhoneNum = reply.PhoneNum;
        console.log(Location);
        console.log(Cuisine);
        req = [Cuisine, Location];

        var https = require('https');
    	var url = "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" + req[0] + "+restaurant+" + req[1] + "&key=GOOGLE API KEY";
    	console.log(url);
    	https.get(url, function(response) {
    	var body ='';
    	response.on('data', function(chunk) {
    	  body += chunk;
    	});
    
    	response.on('end', function() {
    	  var places = (JSON.parse(body)).results;
    	  res[places[0].name] =  places[0].formatted_address;
    	  res[places[1].name] =  places[1].formatted_address;
    	  res[places[2].name] =  places[2].formatted_address;
    	  res[places[3].name] =  places[3].formatted_address;
    	  res[places[4].name] =  places[4].formatted_address;
    	  console.log("res:",res);
    	  var res2 = '1. '+places[0].name+': '+places[0].formatted_address+', 2. '+places[1].name+': '+places[1].formatted_address+', 3. '+places[2].name+': '+places[2].formatted_address+'.';
    	  console.log("res2:",res2);
    	  var dynamodb = new AWS.DynamoDB();

            var DBparams = {
                TableName : "Suggest",
                KeySchema: [       
                    { AttributeName: "NAME", KeyType: "HASH"},  //Partition key
                    { AttributeName: "ADDR", KeyType: "RANGE" }  //Sort key
                ],
                AttributeDefinitions: [       
                    { AttributeName: "NAME", AttributeType: "S" },
                    { AttributeName: "ADDR", AttributeType: "S" }
                ],
                ProvisionedThroughput: {       
                    ReadCapacityUnits: 10, 
                    WriteCapacityUnits: 10
                }
            };
            /*
            dynamodb.createTable(DBparams, function(err, data) {
                if (err) {
                    console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                }
            });*/
            
 
            var docClient = new AWS.DynamoDB.DocumentClient();
            
            console.log("Importing movies into DynamoDB. Please wait.");
            
            
            places.forEach(function(pl) {
                var params = {
                    TableName: "Suggest",
                    Item: {
                        "NAME":  pl.name,
                        "ADDR": pl.formatted_address,
                        "info":  pl
                    }
                };
            
                docClient.put(params, function(err, data) {
                   if (err) {
                       console.error("Unable to add place", pl.name, ". Error JSON:", JSON.stringify(err, null, 2));
                   } else {
                       //console.log("PutItem succeeded:", pl.name);
                   }
                });
            });
    	  //return res;
    	  //console.log(res);
    	  
    	  /*
    	callback(function(){
    	places.forEach(function(pl){  
    	    var params = {
                TableName:"Suggest",
                Key:{
                    "NAME":  pl.name,
                    "ADDR": pl.formatted_address,
                },
            };
            
            console.log("Attempting a conditional delete...");
            docClient.delete(params, function(err, data) {
                if (err) {
                    console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                }
            });
            
    	});    });*/
    	
    	//var SugtoSend = (JSON.stringify(res)).substring(1, (JSON.stringify(res)).length-2); 
    	var MstoSend = `Hello! Here are my ${Cuisine} restaurant suggestions for ${NumPeople} people, at ${DiningTime}: ` + res2 + ' Enjoy your meal!';
    	//var sns = new AWS.SNS();
    	
    	console.log('MStoSend:', MstoSend);
        
        // Create publish parameters
        
        var params = {
          Message: MstoSend, 
          PhoneNumber: '+1'+ PhoneNum,
        };
        
        // Create promise and SNS service object
        var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
        
        // Handle promise's fulfilled/rejected states
        publishTextPromise.then(
          function(data) {
            console.log("MessageID is " + data.MessageId);
          }).catch(
            function(err) {
            console.error(err, err.stack);
          });
  
  

    	
        
    	  callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `${PhoneNum} Hello! Here are my ${Cuisine} restaurant suggestions for ${NumPeople} people, for ${DiningTime}: ${Location}. Enjoy your meal!`}));
    places.forEach(function(pl){  
    	    var params = {
                TableName:"Suggest",
                Key:{
                    "NAME":  pl.name,
                    "ADDR": pl.formatted_address,
                },
            };
            
            //console.log("Attempting a conditional delete...");
            docClient.delete(params, function(err, data) {
                if (err) {
                    console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    //console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                }
            });
            
    	});
    	});
    	}).on('error', function(e) {
    	console.log("Got error: " + e.message);
    	});
	
        //console.log("resmain", res);
        sqs.deleteMessage(deleteParams, function(err, data) {
          if (err) {
            console.log("Delete Error", err);
          } else {
            console.log("Message Deleted", data);
          }
        });
      }
    });

    //console.log(Location);
    //console.log(Cuisine);
    
    
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