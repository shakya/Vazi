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

        dbConnecion.query('SELECT * from DEVICE', function (err, rows, fields) {
            console.log("Result: " + rows);

            if (!err) {
                console.log('The solution is: ', rows);
                response.writeHead(200, {'Content-Type': 'application/json; charset=ISO-8859-1'});
                try {
                    var jsonStr = "[";
                    var notFirst;
                    for (var key in rows) {
                        if (rows.hasOwnProperty(key)) {
                            console.log(key, rows[key]);
                            if (notFirst) {
                                jsonStr += ","
                            }
                            notFirst = true;
                            jsonStr += "{"
                                + "\"deviceID\":\"" + rows[key].DEVICE_ID + "\""
                                + ",\"key\":\"" + rows[key].DEVICE_KEY + "\""
                                + ",\"state\":\"" + rows[key].IS_ACTIVE + "\""
                                + ",\"description\":\"" + rows[key].DESCTIPTION + "\""
                                + "}"
                        }
                    }
                    jsonStr += "]"
                    // var cons = getConnections()
                    // var consStr = [];
                    // var c = 0;


                    // var jsonStr = "[";
                    // var notFirst;
                    // for (var key in wrappedConnections) {
                    //     if (wrappedConnections.hasOwnProperty(key)) {
                    //         console.log(key, wrappedConnections[key]);
                    //         if (notFirst) {
                    //             jsonStr += ","
                    //         }
                    //         notFirst = true;
                    //         jsonStr += "{"
                    //             + "\"key\":\"" + wrappedConnections[key]._connection.remoteAddress + "\""
                    //             + ",\"state\":\"" + wrappedConnections[key]._state + "\""
                    //             + ",\"description\":\"" + "\"NA" + "\""
                    //             + "}"
                    //     }
                    // }
                    // jsonStr += "]"
                    response.write(jsonStr);
                } catch (e) {
                    console.log(e);
                }
                response.end();
            }
            else
                console.log('Error while performing Query.');
            // dbConnecion.end();
        })
    }

    function getdevices2() {

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
    } else if (pathname == '/login') {
        var token = "";
        var status = "";
        var q = url.parse(request.url, true);
        var username = q.query.username;
        var password = q.query.password;
        if (!username || !password) {
            status = "Username or password empty";
            sendLoginResponse();
            return;
        }
        var isAuthenticated = authenticateUserWithUsernameAndPasswordFunction(username, password);
        if (isAuthenticated) {
            status = "login success";
            token = getTokenForUser(username);
            sendLoginResponse();
            return;
        } else {
            status = "login failed check username and password";
            sendLoginResponse();
            return;
        }

        function sendLoginResponse() {
            console.log("statuss = " + status + " , token = " + token);
            response.writeHead(200, {'Content-Type': 'application/json; charset=ISO-8859-1'});
            try {

                var jsonStr = JSON.stringify('{"token":"' + token + '","status":"' + status + '"}');
                response.write(jsonStr);

            } catch (e) {
                console.log("exception at pathname=/login " + e);
            }
            response.end();
        }

    }


}).listen(8081);

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');

var buildHTML = function () {
    var html = header
        + " <body>"
        + nav
        + desc;

    html += "<div class=\"container\">" +
        "    <div class=\"row\">";

    var i = 1;
    for (var key in getConnections()) {
        if (wrappedConnections.hasOwnProperty(key)) {
            var checked = wrappedConnections._state == STATE_ON;
            html += "<div class=\"col-md-4\">" +
                "<h2>LIGHT " + i + "</h2>" +
                "<p>Light Key: ";
            html += "<label class=\"switch\">" + key + "<input type=\'checkbox\'  onclick=\'handleClick(\"" + key + "\",this);\'";
            if (wrappedConnections[key]._state == STATE_ON) {
                html += " checked"
            }
            html += "> <span class=\"slider round\"></span></label></p>"
            i = i + 1;
            html += "</div>"
        }
    }

    html += "</div>";

    html += "<script>"
        + "function handleClick(key,cb) {"
        + "var xhttp = new XMLHttpRequest();"
        + "xhttp.open(\"GET\", \"http://127.0.0.1:8081/switch?key=\"+key+\"&status=\"+cb.checked, true);"
        + "xhttp.send();"
        + "}"
        + "</script>"
        + footer;
    return html;
};


var WrappedConnection = function (connection, state) {
    this._connection = connection;
    this._state = state;
};

var css = "<style>" 
    + ".footer {" 
    + "  position: fixed;" 
    + "  bottom: 0px;" 
    + "  margin-top: 20px;" 
    + "  height: 50px;" 
    + "  clear:both;" 
    + "  padding-top:20px;" 
    + "} " 
    + ".swon {" 
    + "   background-image: linear-gradient(to bottom,#08ff1c 0,#0aed0d 100%);" 
    + "}" 
	+ " /* The switch - the box around the slider */"
	+ ".switch {"
	+ "  position: relative;"
	+ "  display: inline-block;"
	+ "  width: 60px;"
	+ "  height: 34px;"
	+ "}"
	+ "/* Hide default HTML checkbox */"
	+ ".switch input {display:none;}"
	+ "/* The slider */"
	+ ".slider {"
	+ "  position: absolute;"
	+ "  cursor: pointer;"
	+ "  top: 0;"
	+ "  left: 0;"
	+ "  right: 0;"
	+ "  bottom: 0;"
	+ "  background-color: #ccc;"
	+ "  -webkit-transition: .4s;"
	+ "  transition: .4s;"
	+ "}"
	+ ".slider:before {"
	+ "  position: absolute;"
	+ "  content: \"\";"
	+ "  height: 26px;"
	+ "  width: 26px;"
	+ "  left: 4px;"
	+ "  bottom: 4px;"
	+ "  background-color: white;"
	+ "  -webkit-transition: .4s;"
	+ "  transition: .4s;"
	+ "}"
	+ "input:checked + .slider {"
	+ "  background-color: #2196F3;"
	+ "}"
	+ "input:focus + .slider {"
	+ "  box-shadow: 0 0 1px #2196F3;"
	+ "}"
	+ "input:checked + .slider:before {"
	+ "  -webkit-transform: translateX(26px);"
	+ "  -ms-transform: translateX(26px);"
	+ "  transform: translateX(26px);"
	+ "}"
	+ "/* Rounded sliders */"
	+ ".slider.round {"
	+ "  border-radius: 34px;"
	+ "}"
	+ ".slider.round:before {"
	+ "  border-radius: 50%;"
	+ "} "
    + "</style>";

var header = "<!doctype html>" 
    + "<html xmlns=\"http://www.w3.org/1999/xhtml\" lang=\"en\" dir=\"ltr\">"
    + "<head>"
    + "  <meta http-equiv=\"content-type\" content=\"application/xhtml+xml; charset=UTF-8\" />"
    + "  <meta http-equiv=\"X-UA-Compatible\" content=\"chrome=1\">"
    + "  <meta name=\"google\" value=\"notranslate\">"
    + "  <link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css\">"
    + "  <link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap-theme.min.css\">"
    + "  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.2.0/css/font-awesome.min.css\">"
    + "  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/bootstrap-switch/3.3.4/css/bootstrap3/bootstrap-switch.min.css\">"
    + "  <script src=\"https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js\"></script>"
    + "  <script src=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js\"></script>"
    + "  <script src=\"https://cdnjs.cloudflare.com/ajax/libs/bootstrap-switch/3.3.4/js/bootstrap-switch.js\"></script>"
	+ "  <title>Vazi</title>"
	+ css
	+ "</head>";

var nav = "<nav class=\"navbar navbar-inverse navbar-fixed-top\">" 
    + "    <div class=\"container\">" 
    + "      <div class=\"navbar-header\">" 
    + "        <button type=\"button\" class=\"navbar-toggle collapsed\" data-toggle=\"collapse\" data-target=\"#navbar\" aria-expanded=\"false\" aria-controls=\"navbar\">" 
    + "          <span class=\"sr-only\">Toggle navigation</span>" 
    + "          <span class=\"icon-bar\"></span>" 
    + "          <span class=\"icon-bar\"></span>" 
    + "          <span class=\"icon-bar\"></span>" 
    + "        </button>" 
    + "        <a class=\"navbar-brand\" href=\"#\">Vazi Holms</a>" 
    + "      </div>" 
    + "      <div id=\"navbar\" class=\"navbar-collapse collapse\">" 
    + "        <form class=\"navbar-form navbar-right\">" 
    + "          <div class=\"form-group\">" 
    + "            <!-- <input type=\"text\" placeholder=\"Email\" class=\"form-control\"> -->" 
    + "          </div>" 
    + "          <div class=\"form-group\">" 
    + "            <!-- <input type=\"password\" placeholder=\"Password\" class=\"form-control\"> -->" 
    + "          </div>" 
    + "          <!-- <button type=\"submit\" class=\"btn btn-success\">Sign in</button> -->" 
    + "        </form>" 
    + "      </div>" 
    + "    </div>" 
    + "  </nav>";
	
var desc = "<div class=\"jumbotron\">" 
    + "    <div class=\"container\">" 
    + "      <h1>Hello, </h1>" 
    + "      <p>" 
    + "        This is a simple example of displaying vazi intigrated home appliances in a web application." 
    + "      </p>" 
    + "      <!-- <p><a class=\"btn btn-primary btn-lg\" href=\"#\" role=\"button\">Learn more &raquo;</a></p> -->" 
    + "    </div>" 
    + "  </div>";

var footer = "<hr>" 
    + "    <footer  class=\"footer\">" 
    + "      <p>&copy; Vazi holmes 2017</p>" 
    + "    </footer>" 
    + "  </div> <!-- /container -->" 
    + "</body>" 
    + "</html>";
	
	
function authenticateUserWithUsernameAndPasswordFunction(username, password) {
    const sql = 'SELECT * from USER where USERNAME = ' + dbConnecion.escape(username) + ' AND PASSWORD=' + dbConnecion.escape(password);
    console.log(sql)
    dbConnecion.query(sql, function (err, rows, fields) {
        console.log("Result: " + rows);

        if (!err) {
            if (rows.length > 0) {
                console.log('login function isAuthenticated = true');
                return true;
            }
        }
        else
            console.log('Error while performing Query.');

        console.log('login function isAuthenticated = false');
        return false;
    })
}

function getTokenForUser(username) {
    var stringForToken = "";
    var dateInMillis = new Date().getMilliseconds();
    stringForToken = stringForToken + dateInMillis + username;
    var token = SHA1(stringForToken);
    //add new token to db
    return token;
}

function SHA1(msg) {
    function rotate_left(n, s) {
        var t4 = ( n << s ) | (n >>> (32 - s));
        return t4;
    };
    function lsb_hex(val) {
        var str = "";
        var i;
        var vh;
        var vl;
        for (i = 0; i <= 6; i += 2) {
            vh = (val >>> (i * 4 + 4)) & 0x0f;
            vl = (val >>> (i * 4)) & 0x0f;
            str += vh.toString(16) + vl.toString(16);
        }
        return str;
    };
    function cvt_hex(val) {
        var str = "";
        var i;
        var v;
        for (i = 7; i >= 0; i--) {
            v = (val >>> (i * 4)) & 0x0f;
            str += v.toString(16);
        }
        return str;
    };
    function Utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };
    var blockstart;
    var i, j;
    var W = new Array(80);
    var H0 = 0x67452301;
    var H1 = 0xEFCDAB89;
    var H2 = 0x98BADCFE;
    var H3 = 0x10325476;
    var H4 = 0xC3D2E1F0;
    var A, B, C, D, E;
    var temp;
    msg = Utf8Encode(msg);
    var msg_len = msg.length;
    var word_array = new Array();
    for (i = 0; i < msg_len - 3; i += 4) {
        j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
            msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
        word_array.push(j);
    }
    switch (msg_len % 4) {
        case 0:
            i = 0x080000000;
            break;
        case 1:
            i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
            break;
        case 2:
            i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
            break;
        case 3:
            i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
            break;
    }
    word_array.push(i);
    while ((word_array.length % 16) != 14) word_array.push(0);
    word_array.push(msg_len >>> 29);
    word_array.push((msg_len << 3) & 0x0ffffffff);
    for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
        for (i = 0; i < 16; i++) W[i] = word_array[blockstart + i];
        for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
        A = H0;
        B = H1;
        C = H2;
        D = H3;
        E = H4;
        for (i = 0; i <= 19; i++) {
            temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }
        for (i = 20; i <= 39; i++) {
            temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }
        for (i = 40; i <= 59; i++) {
            temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }
        for (i = 60; i <= 79; i++) {
            temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }
        H0 = (H0 + A) & 0x0ffffffff;
        H1 = (H1 + B) & 0x0ffffffff;
        H2 = (H2 + C) & 0x0ffffffff;
        H3 = (H3 + D) & 0x0ffffffff;
        H4 = (H4 + E) & 0x0ffffffff;
    }
    var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

    return temp.toLowerCase();
}

var mysql = require('mysql');

var dbConnecion = mysql.createConnection({
    host: "sql12.freemysqlhosting.net",
    user: "sql12189003",
    password: "RKbKxYNYgn",
    database: "sql12189003"
});

dbConnecion.connect(function (err) {
    if (!err) {
        console.log("Database is connected ... nn");
    } else {
        console.log("Error connecting database ... nn");
    }
});
