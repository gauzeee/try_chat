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


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(multer.array());
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');


app.get('/', function (req, res) {
    res.render('index');
});

// TO DO: Отдавать все имена пользователей толкьо при первом коннекте юзера, на джоины отдавать одного.
// Добавить к обьектам в users id сокета, что бы знать куда кидаться.

let users = {};

app.post('/', function (req, res) {
        const db = monga.db('chatApp');
        let connectedUser = req.body.username;
         db.collection('users').find({}).toArray((err, docs) => {
            let dbUsers = docs;
            connectedUser = dbUsers.filter((user) => {
               if(connectedUser === user.name) {
                   user.online = true;
                   return user;
               }
            })[0];
            console.log(connectedUser);
            if(!connectedUser) {
                connectedUser = createUser(req.body.username);
                db.collection('users').insertOne(connectedUser);
                connectedUser.online = true;
            }
            let gotOne = false;
            for (let user in users) {
               if(user === connectedUser.name) {
                   gotOne = true;
               }
            };
            if(!gotOne) users[connectedUser.name.toLowerCase()] = connectedUser;
            console.log(users);
             res.cookie('username', connectedUser.name);
             res.redirect('/chat');
        });
});

app.get('/chat', function (req, res) {
    res.render('chat');
    io.once('connection', function (socket) {
        socket.on('connected', function (username) {
            socket.username = username.toLowerCase();
            let connUser = users[username.toLowerCase()];
            connUser.online = true;
            socket.emit('connected', users, connUser.rooms);
            console.log("CONN USERS", users);
            socket.broadcast.emit('join', connUser, users);
        });

        socket.on('disconnect', function () {
            let leftUser = users[socket.username.toLowerCase()];
            leftUser.online = false;
            console.log('DISSCON USERNAME', socket.username);
            socket.broadcast.emit('left', {users, leftUser});
            console.log("DISSCON USERS",users);
        });

        socket.on('create room', function (user) {
          if(socket.username !== user.name) {
            const room = `${user.name}-${socket.username}`;
            socket.join(room);

            users[socket.username.toLowerCase()].rooms.push(room);
            user.rooms.push(room);
            io.emit('new room', users);
          }
        });


        socket.on('typing', function (username) {
            socket.broadcast.emit('typing', username);
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
     return  {name:username, rooms: ['test']}
}