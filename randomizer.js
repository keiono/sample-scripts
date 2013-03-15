// Sample client for exchanging data Cy3-node.js-Cy3

// Imports modules
var http = require('http');
var async = require('async');
var request = require('request');
var inspect = require('util').inspect;
var $ = require('jquery');
var csv = require('ya-csv');


// Cytoscape REST
var BASE_URL = 'http://localhost:9988/';
var REPORT_FILE_NAME = 'report.csv';
var writer = csv.createCsvFileWriter(REPORT_FILE_NAME);

var parameters = {
    parentSUID: process.argv[2]
}

var tasks = [];

var counter = 0;
var columnNmaes = ['trial'];


// Filal report will be stored here.
var resultArray = [];

var workflow = [
    function (next) {
        request(BASE_URL + 'execute/randomizedNetworkTaskFactory/' + parameters.parentSUID,
            function (err, res, body) {
                if (err) {
                    throw err;
                }
                console.log(inspect({
                    err: err,
                    res: {
                        statusCode: res.statusCode
                    },
                    body: 'OK'
                }))
                next(null, JSON.parse(body))
            }
        );
    },
    function (arg, next) {
        console.log("Current Net " + arg.currentNetwork);

        request(BASE_URL + 'execute/organizeEdgesTaskFactory/' + arg.currentNetwork,
            function () {
                next(null, arg.currentNetwork)
            }
        );
    },
    function (arg, next) {
        console.log("Creating network attributes for: " + arg);

        request(BASE_URL + 'execute/generateReportTaskFactory/' + arg,
            function () {
                next(null, arg)
            }
        );
    },
    function (arg, next) {
        console.log('Processing CSV...');
        request(BASE_URL + 'network/' + arg,
            function (err, res, body) {
                if (err) {
                    throw err;
                }
                console.log('Body len = ' + body.length);
                var networkData = JSON.parse(body);
                var network = networkData.network;
                var networkName = network.name.value;
                var nodes = network.nodes;
                var edges = network.edges;

                console.log('Network Name = ' + networkName);
                console.log('Nodes = ' + nodes.length);
                console.log('Edges = ' + edges.length);
                counter++;

                var result = {
                    index: counter
                };


                for (var key in network) {
                    if (key != 'nodes' && key != 'edges') {
                        var networkAttribute = network[key];
                        if (networkAttribute instanceof Array) {
                            result[key] = networkAttribute;
                        }
                        console.log(key + ' = ' + network[key]);
                    }

                }
                resultArray.push(result);

                next(null, arg);
            }
        );
    },
    function (arg, next) {
        console.log("To be deleted " + arg);

        request(BASE_URL + 'execute/networks/DestroyNetworkTaskFactoryImpl/' + arg,
            function () {
                next(null)
            }
        );
    }
];


/**
 * Generate an CSV report file for the given network data.
 *
 * @param network
 */
function generateReport(network) {
    var nodes = network.nodes;
    var clusters = [];
    for (var key in nodes) {

    }
}


// Add tasks to the array.
for (var i = 0; i < 100; i++) {
    for (var j = 0; j < workflow.length; j++) {
        tasks.push(workflow[j]);
    }
}

function done(err) {
    if (err) {
        throw err;
    }

    // Create Column Names
    var firstLine = resultArray[0];
    var colName = [];
    for (var col in firstLine) {
        console.log('COL = ' + col);
        colName.push(col);
    }

    writer.writeRecord(colName);

    for (var key in resultArray) {
        var entry = resultArray[key];

        console.log('ENT = ' + JSON.stringify(entry));

        var line = [];
        for (var colTitle in colName) {
            console.log('Title = ' + colTitle);
            console.log('Val = ' + colName[colTitle]);
            if (colName[colTitle] == 'index') {
                line.push(entry[colName[colTitle]]);
            } else {
                var statArray = entry[colName[colTitle]];
                var stringCell = '[';
                for (var stat in statArray) {
                    stringCell = stringCell + statArray[stat].value + ',';

                }
                stringCell = stringCell.substring(0, (stringCell.length-1)) + ']';
                line.push(stringCell);
            }
        }

        writer.writeRecord(line);
    }
    console.log('finished!!!! ' + columnNmaes);
}

async.waterfall(tasks, done);

