// Express Setup
var express = require("express");
var cors = require("cors");
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
app.use(cors());
var port = process.env.PORT || 3001;

// MySQL Setup
var mysql = require("mysql");

// Setting out static directory
app.use(express.static("public"));

// Setting our view engine
app.set("view engine", "ejs");

function createConnection() {
    return mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "youtube-video-app"
    })
}

function isOutdated(timestamp) {
    var then = new Date(timestamp);
    var now = new Date();

    const msBetweenDates = Math.abs(then.getTime() - now.getTime());

    // Convert ms to hours
    const hoursBetweenDates = msBetweenDates / (60 * 60 * 1000);
    
    if (hoursBetweenDates < 24) {
        return false;
    } else {
        return true;
    }
}

function deleteData(primaryKey, req, res, con) {
    return new Promise((resolve, reject) => {

        con.query(`DELETE FROM videos WHERE id = "${primaryKey}"`, function (err, result, fields) {
            if (err) {
                return reject(err);
            }
            
            res.send(JSON.stringify({
                error: "Video is outdated!"
            }))
    
            return resolve();
        });
    })
}

function checkDatabase(videoId, req, res) {
    return new Promise((resolve, reject) => {
        var con = createConnection();

        con.connect(function(err) {
            if (err) {
                return reject(err);
            }

            con.query(`SELECT * FROM videos WHERE videoId = "${videoId}"`, function (err, result, fields) {
                if (err) {
                    return reject(err);
                }

                // Returning JSON
                res.setHeader('Content-type', 'application/json');
                var data = result[0];
                
                if (result.length) {

                    if (!isOutdated(data.timestamp)) {

                        res.send(JSON.stringify({
                            data: data
                        }));

                    } else {

                        // Deleting the outdated data
                        deleteData(data.id, req, res, con);

                    }

                } else {

                    res.send(JSON.stringify({
                        error: "Video not found!"
                    }))

                }

                return resolve();
            });
        })
    })
}

function saveData(data, req, res) {
    var comments = JSON.stringify(data.comments);

    var sql = `INSERT INTO videos (videoId, comments) VALUES ('${data.videoId}', '${comments}')`;
    return new Promise((resolve, reject) => {
        var con = createConnection();

        con.connect(function(err) {
            if (err) {
                return reject(err);
            }

            con.query(sql, function (err, result, fields) {
                if (err) {
                    return reject(err);
                }

                res.send(JSON.stringify({
                    success: "The data has been saved!"
                }))

                return resolve();
            })
        })
    })
}

app.get("/check-database", function (req, res) {
    checkDatabase(req.query.id, req, res);
});

app.post("/save-video-data", jsonParser, function (req, res) {
    saveData(req.body, req, res);
});

app.get("/", function (req, res) {
    res.render('index');
})

app.listen(port);