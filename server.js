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
let db;
let typers = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(multer.array());
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'hbs');


app.get('/', function (req, res) {
    res.render('index', {
        test: "Hello World!"
    });
    if(!db) db = monga.db('chatApp');
});

app.get('/registration', function (req, res) {
    res.render('reg');
});

app.post('/registration', function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    if(!db) db = monga.db('chatApp');

});

// TO DO: Отдавать все имена пользователей толкьо при первом коннекте юзера, на джоины отдавать одного.
// Добавить к обьектам в users id сокета, что бы знать куда кидаться.

app.post('/', async function (req, res) {
        let connectedUserName = req.body.username.toLowerCase().trim();
        console.log("CONNECTED USER", {name: connectedUserName});
        if(!connectedUserName.length) return;
    //db.collection('users').deleteMany({});


         let connectedUser = await db.collection('users').findOne({name: connectedUserName});
           // .toArray((err, docs) => {
                // let dbUsers = docs;
                // connectedUser = dbUsers.filter((user) => {
                //    if(connectedUser === user.name) {
                //        user.online = true;
                //        return user;
                //    }
                // })[0];
            if(!connectedUser) {
                connectedUser = createUser(req.body.username.trim());
                 await db.collection('users').insertOne(connectedUser);
            }
            // let gotOne = false;
            // for (let user in users) {
            //    if(user === connectedUser.name) {
            //        gotOne = true;
            //    }
            // };
            // if(!gotOne) users[connectedUser.name] = connectedUser;
            // console.log(users);
             db.collection('users').updateOne({name: connectedUser.name}, {$set: {"online": true}}, {upsert: true});
             console.log('USER IN POST', connectedUser);
             res.cookie('username', connectedUser.displayedName);
             res.redirect('/chat');

});

app.get('/chat',  function (req, res) {
    res.render('chat');

    io.once('connection', function (socket) {
        socket.on('connected', async function (username) {
            socket.username = username.toLowerCase();
            console.log("USERNAME", username.toLowerCase());
            let connUser = await db.collection('users').findOneAndUpdate(
                {"name": socket.username},
                {$set: {"socketId": socket.id}}
            );
            let users = {};
            await db.collection('users').find({}).toArray((err, docs) => {
                console.log("tempUsers", docs);
                docs.forEach(user=> {
                    console.log("user in each", user);
                    users[user.name] = {
                        name: user.displayedName,
                        online: user.online
                    }
                });
                connUser = connUser.value;
                socket.userId = connUser._id;
                delete connUser.socketId;
                delete connUser._id;
                console.log("CONN USERS", users, connUser);
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