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

app.post('/', function (req, res) {
        const db = monga.db('chatApp');
        let users = null;
        let user = null;

         db.collection('users').find({'username': req.body.username}).toArray((err, docs) => {
            users = docs;
            if(users && users.length) {
                user = users[0];
            } else {
                user = createUser(req.body.username);
                db.collection('users').insertOne(user);
            }
             console.log(user);
             res.cookie('username', user.username);
             res.cookie('id', user._id);
             res.cookie('rooms', user.rooms);
             res.redirect('/chat');
        });
});


const onLine = [];

app.get('/chat', function (req, res) {
    res.render('chat');
    io.once('connection', function (socket) {
        socket.on('connected', function (username) {
            console.log(socket.id);
            let gotOne = false;
            onLine.forEach(user => {
               if(user.username === username) {
                   gotOne = true;
               }
            });
            if(!gotOne) {
                onLine.push({username: username, id: socket.id});
            }
            console.log(onLine);
            io.emit('join', onLine);
        });

        socket.on('disconnect', function () {
            console.log('disconnected', onLine);
            io.emit('left', {id: socket.id, users: onLine});
            onLine.filter((user) => {
                if(user.id !== socket.id) {
                    return user;
                }
            });
            console.log(onLine);
        });


        socket.on('typing', function (username) {
            socket.broadcast.emit('typing', username);
        });

        socket.on('send message', function (data) {
            socket.broadcast.emit('message', data);
            socket.emit('message', data);
            //socket.emit('test', users);
        })
    });
})


monga.connect( (err) => {
    if (err) return console.log(err);
    const db = monga.db('chatApp');
    server.listen(3000, function () {
        console.log('Server starts on 3000 port');
    });
});

 function createUser(username) {
     return  {username:username, rooms: []}
}