#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');
var url = require('url');
var wrappedConnections = [];
var itr = 0;
const STATE_ON = "on";
const STATE_OFF = "off";

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(200, {
        "Content-Type": "text/plain; charset=UTF-8",
        "Content-Length": 104,
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Origin": "file://",
        "Set-Cookie": "io=ADsfUjou0zt1V6qOAAC2; Path=/; HttpOnly",
        "Date": new Date(),
        "Connection": "keep-alive"
    });
    response.end();
});
server.listen(9999, function () {
    console.log((new Date()) + ' Server is listening on port 9999');
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

(function (global) {
    global.getConnections = function () {
        return wrappedConnections;
    };
})(global);

wsServer.on('request', function (request) {

    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var connection = request.accept('arduino', request.origin);
    var sid = request.remoteAddress;

    wrappedConnections[sid] = new WrappedConnection(connection, STATE_OFF);
    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log((new Date()).toLocaleString() + " " + connection.remoteAddress + ' Status: ' + message.utf8Data);
            // if (message.utf8Data == "0") {
            //     connection.sendUTF('{"S":"1"}');
            // }
            // if (message.utf8Data == "1") {
            //     connection.sendUTF('{"S":"0"}');
            // }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            //connection.sendBytes(message.binaryData);
        }
    });

    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        wrappedConnections[sid] = null;
        delete wrappedConnections[sid];
    });

    connection.sendUTF("Hallo Client!");
});

// Create a server

http.createServer(function (request, response) {
    // Parse the request containing file name
    var pathname = url.parse(request.url).pathname;

    // Print the name of the file for which request is made.
    console.log("Request for " + pathname + " received.");


    function getdevices() {
        console.log('getdevices')
        response.writeHead(200, {'Content-Type': 'application/json; charset=ISO-8859-1'});
        try {
            var cons = getConnections()
            // var consStr = [];
            // var c = 0;
            var jsonStr = "[";
            var notFirst;
            for (var key in wrappedConnections) {
                if (wrappedConnections.hasOwnProperty(key)) {
                    console.log(key, wrappedConnections[key]);
                    if (notFirst) {
                        jsonStr += ","
                    }
                    notFirst = true;
                    jsonStr += "{"
                        + "\"key\":\"" + wrappedConnections[key]._connection.remoteAddress + "\""
                        + ",\"state\":\"" + wrappedConnections[key]._state + "\""
                        + ",\"description\":\"" + "\"NA" + "\""
                        + "}"
                }
            }
            jsonStr += "]"
            response.write(jsonStr);
        } catch (e) {
            console.log(e);
        }
        response.end();
    }

    function changeStatus() {
        console.log('switch')
        response.writeHead(200, {'Content-Type': 'application/json; charset=ISO-8859-1'});
        try {
            var q = url.parse(request.url, true);
            var toStatus = q.query.status;
            var key = q.query.key;
            console.log('toStatus:' + toStatus)
            console.log('key:' + key)

            var wrappedConnection = getConnections()[key];
            var conToChange = wrappedConnection._connection;


            if (toStatus == STATE_ON || toStatus == 'true') {
                conToChange.sendUTF('{"S":"1"}');
                wrappedConnection._state = STATE_ON;
            }
            if (toStatus == 'off' || toStatus == 'false') {
                conToChange.sendUTF('{"S":"0"}');
                wrappedConnection._state = STATE_OFF;

            }
            var jsonStr = JSON.stringify('{"S":"' + toStatus + '"}');
            response.write(jsonStr);
        } catch (e) {
            console.log(e);
        }
        response.end();
    }

    function list() {
        console.log('list');
        response.writeHead(200, {'Content-Type': 'text/html'});
        var html = buildHTML();
        response.write(html);
        response.end();
    }

    if (pathname == '/getdevices') {
        getdevices();
    }
    else if (pathname == '/switch') {
        changeStatus();
    }
    else if (pathname == '/list') {
        list();
    }


}).listen(8081);

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');

var buildHTML = function () {
    var html = "<!DOCTYPE html>"
        + " <html>"
        + " <body>"
        + " <h2>Devices</h2>";
    for (var key in getConnections()) {
        if (wrappedConnections.hasOwnProperty(key)) {
            var checked = wrappedConnections._state == STATE_ON;
            html += "<label>" + key + "<input type=\'checkbox\'  onclick=\'handleClick(\"" + key + "\",this);\'";
            if (wrappedConnections[key]._state == STATE_ON) {
                html += " checked"
            }
            html += "> </label><br/>"

        }
    }
    html += "<script>function handleClick(key,cb) {"

        + "var xhttp = new XMLHttpRequest();"
        + "xhttp.open(\"GET\", \"http://127.0.0.1:8081/switch?key=\"+key+\"&status=\"+cb.checked, true);"
        + "xhttp.send();"
        + "}</script>"
    " < / body > "
    + "</html>"
    return html;
};


var WrappedConnection = function (connection, state) {
    this._connection = connection;
    this._state = state;
};