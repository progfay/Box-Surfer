const express = require('express');
const request = require('request').defaults({ encoding: null });
const URLSafeBase64 = require('urlsafe-base64');

let defaultPort = 8000;

let app = express();
let server = app.listen(process.env.PORT || defaultPort, () => {
    console.log('start server listening', process.env.PORT || defaultPort);
    console.log('http://localhost:' + (process.env.PORT || defaultPort));
})

app.use(express.static(__dirname + './../src', {
    setHeaders: function setHeaders(res, path, stat) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    }
}));

// app.use('/root', express.static(__dirname + './../src'));

app.get('/url2base64', function(req, res) {
    const url = decodeURIComponent(req.query.url);
    request.get(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
            res.send(data);
        } else {
            res.send("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEHAAEALAAAAAABAAEAAAICTAEAOw==");
        }
    });
});
