const express = require('express');
const request = require('request').defaults({ encoding: null });
const URLSafeBase64 = require('urlsafe-base64');
const open = require('open');

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

app.use(express.static(__dirname + './../design', {
    setHeaders: function setHeaders(res, path, stat) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    }
}));

/*
 * get base64 image from image url
 * on error, return empty base64 image
 * (query) url: image url
 */
app.get('/url2base64', function(req, res) {
    const url = decodeURIComponent(req.query.url);
    request.get(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            let data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
            res.send(data);
        } else {
            res.send("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEHAAEALAAAAAABAAEAAAICTAEAOw==");
        }
    });
});


/*
 * get Scrapbox's project data by project name
 * on error, return empty String
 * (query) project: project Name
 */
app.get('/projectData', function(req, res) {
    const projectName = decodeURIComponent(req.query.project);
    request.get('https://scrapbox.io/api/pages/' + projectName + '?limit=100', function(error, response, body) {
        if (!error && response.statusCode == 200) {
            let count = JSON.parse(body).count;
            if (count <= 100) {
                res.send(body);
            } else {
                request.get(
                    'https://scrapbox.io/api/pages/' + projectName + '?limit=' + count,
                    (error, response, _body) => { res.send(!error && response.statusCode == 200 ? _body : "") }
                );
            }
        } else {
            res.send("");
        }
    });
});


/*
 * open url page in servered PC
 * (query) url : open url
 */
app.get('/open', function(req, res) {
    open(decodeURIComponent(req.query.url));
    res.send('');
});