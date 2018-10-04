#!/usr/bin/env node

'use strict';

let appInsights = require('applicationinsights');
var request = require('request');

var amqp = require('amqplib/callback_api');

// Let's validate and spool the ENV VARS
if (process.env.AMQPURL.length == 0) {
    console.log("The environment variable AMQPURL has not been set");
} else {
    console.log("The environment variable AMQPURL is " + process.env.AMQPURL);
}

if (process.env.PROCESSENDPOINT.length == 0) {
    console.log("The environment variable PROCESSENDPOINT has not been set");
} else {
    console.log("The environment variable PROCESSENDPOINT is " + process.env.PROCESSENDPOINT);
}

if (process.env.TEAMNAME.length == 0) {
    console.log("The environment variable TEAMNAME has not been set");
} else {
    console.log("The environment variable TEAMNAME is " + process.env.TEAMNAME);
}


// Start
var connectionString = process.env.AMQPURL;
var processendpoint = process.env.PROCESSENDPOINT;
var insightsKey = process.env.CHALLENGEAPPINSIGHTS_KEY;
var teamname = process.env.TEAMNAME;
var amqpConn = null;


if (insightsKey != "") {
    appInsights.setup(insightsKey).start();
}

console.log("Connecting to Rabbit instance: " + connectionString);
start();

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}

function start() {
    amqp.connect(connectionString, function (err, conn) {

        if (err) {
            // We had a problem connection to the instance, retry again
            console.error("Error connecting to Rabbit instance. Will retry in 10 seconds: " + err);
            return setTimeout(start, 10000);
        }

        conn.on("error", function (err) {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message);
            }
        });

        conn.on("close", function () {
            console.error("[AMQP] reconnecting");
            return setTimeout(start, 10000);
        });

        console.log("[AMQP] connected");
        amqpConn = conn;

        whenConnected();
    });
}

function whenConnected() {
    startWorker();
}

function startWorker() {
    amqpConn.createChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function (err) {
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close", function () {
            console.log("[AMQP] channel closed");
        });

        var q = 'order';

        ch.assertQueue(q, {
            durable: true
        });
        ch.prefetch(1);
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
        ch.consume(q, function (msg) {
            console.log(" [x] Received %s", msg.content.toString());
            var orderJson = JSON.parse(msg.content);
            var orderId = orderJson.order;
            console.log("order " + orderId);

            // Set the headers
            var headers = {
                'Content-Type': 'application/json'
            };

            if (processendpoint != "") {
                // Configure the request
                var options = {
                    url: processendpoint,
                    method: 'POST',
                    headers: headers,
                    json: {
                        'OrderId': orderId
                    }
                };

                // Start the request
                console.log('attempting to POST order to fulfill api: ' + processendpoint);
                request(options, function (error, response, body) {
                    console.log('statusCode:', response && response.statusCode);
                    console.log('error:', error);
                    console.log('body:', body);

                    // Acknowledge the message if we don't have errors
                    if (!error) {
                        console.log("acknowledging message");
                        ch.ack(msg);
                    }
                });
            } // we have a process endpoint
            else {
                console.log('process endpoint not configured at PROCESSENDPOINT');
            }

            try {
                let appclient = appInsights.defaultClient;
                appclient.trackEvent({
                    name: "RabbitMQListener",
                    properties: {
                      team: teamname,
                      sequence: "3",
                      type: "rabbitmq",
                      service: "rabbitmqlistener",
                      orderId: orderId
                    }
                  });
            } catch (e) {
                console.error("AppInsights " + e.message);
            }
        }, {
            noAck: false
        });
    });
}
