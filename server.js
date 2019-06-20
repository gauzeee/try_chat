const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const multer = require('multer')();
const fetch = require("node-fetch");
const mongoClient = require('mongodb').MongoClient;
const dbUrl = 'mongodb://localhost:27017';
const monga = new mongoClient(dbUrl);
const CryptoJs = require('crypto-js');
const salt = 'mYtesTsA1t';
let db;
let typers = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(multer.array());
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'hbs');

app.route('/')
    .get( function (req, res) {
        res.render('index', {
            test: "Hello World!"
        });
        if(!db) db = monga.db('chatApp');
    })
    .post(async function (req, res) {
        let connectedUserName = req.body.username.toLowerCase().trim();
        const pass = req.body.password.trim();
        const encrypted = CryptoJs.AES.encrypt(pass, salt);
        const decrypted = CryptoJs.AES.decrypt(encrypted, salt);
        console.log(pass, encrypted);
        console.log(decrypted.toString(CryptoJs.enc.Utf8));
        //console.log("CONNECTED USER", {name: connectedUserName});
        if(!connectedUserName.length) return;
        //db.collection('users').deleteMany({});


        let connectedUser = await db.collection('users').findOne({name: connectedUserName});
        if(!connectedUser) {
            connectedUser = createUser(req.body.username.trim());
            await db.collection('users').insertOne(connectedUser);
        }
        db.collection('users').updateOne({name: connectedUser.name}, {$set: {"online": true}}, {upsert: true});
        //console.log('USER IN POST', connectedUser);
        res.cookie('username', connectedUser.displayedName);
        //res.redirect('/chat');
    });

app.route('/registration')
    .get(function (req, res) {
        res.render('reg');
    })
    .post(function(req, res) {
        const username = req.body.username;
        const password = req.body.password;
        if(!db) db = monga.db('chatApp');
    });

app.get('/users/*', function (req, res) {
    //console.log(req.url);
    let username = req.url.slice(1,req.url.length);
    username = username.slice(username.indexOf('/') + 1, username.length);
    res.render('user', {
        test: username
    })
});

app.get('/chat',  function (req, res) {
    res.render('chat');

    io.once('connection', function (socket) {
        socket.on('connected', async function (username) {
            socket.username = username.toLowerCase();
            //console.log("USERNAME", username.toLowerCase());
            let connUser = await db.collection('users').findOneAndUpdate(
                {"name": socket.username},
                {$set: {"socketId": socket.id}}
            );
            let users = {};
            await db.collection('users').find({}).toArray((err, docs) => {
                console.log("tempUsers", docs);
                docs.forEach(user=> {
                    //console.log("user in each", user);
                    users[user.name] = {
                        name: user.displayedName,
                        online: user.online
                    }
                });
                connUser = connUser.value;
                socket.userId = connUser._id;
                delete connUser.socketId;
                delete connUser._id;
                //console.log("CONN USERS", users, connUser);
                socket.emit('connected', users, connUser.rooms);
                socket.broadcast.emit('join', connUser);
            });


        });

        socket.on('disconnect', async function () {
            let leftUser = await db.collection('users').findOneAndUpdate(
                {"_id": socket.userId},
                {$set: {"online": false}}
            );
            leftUser = leftUser.value;
            socket.broadcast.emit('left', leftUser.displayedName);
        });

        socket.on('create room', function (user) {
          if(socket.username !== user.name) {
            const room = `${user.name}-${socket.username}`;
            socket.join(room);

            users[socket.username].rooms.push(room);
            user.rooms.push(room);
            io.emit('new room', users);
          }
        });


        let clearTypers;
        socket.on('typing', function (username) {
            clearTimeout(clearTypers);
            if (!typers.includes(username)) typers.push(username);
            socket.broadcast.emit('typing', typers);
            clearTypers = setTimeout(function () {
                typers = [];
            }, 1000)
        });

        socket.on('send message', function (data) {
           io.emit('message', data);
        })
    });
})


monga.connect( (err) => {
    if (err) return console.log(err);
    const db = monga.db('chatApp');
    server.listen(80, function () {
        console.log('Server starts on 80 port');
    });
});

 function createUser(username) {
     return  {name:username.toLowerCase(), displayedName: username, rooms: ['test'], online: false, socketId: 'temp'}
}