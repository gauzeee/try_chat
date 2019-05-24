import io from 'socket.io-client';
document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const chat = document.querySelector('.chat');
    const form = chat.querySelector('form');
    const list = chat.querySelector('ul');
    const input = form.querySelector('input');
    const username = capitalize(getCookie('username'));
    const typing = chat.querySelector('#typing');
    const title = chat.querySelector('h1');
    const usersList = document.getElementById('users-list');
    const roomsList = document.getElementById('rooms-list');
    let stopTyping = true;
    let timer = null;
    let allUsers = [];
    let allRooms = [];


    title.innerText = 'Hello, ' + username;

    socket.emit('connected', username);

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        socket.emit('send message', {name: username, message: input.value});
        input.value = '';
    });

    input.addEventListener('input', function () {
        socket.emit('typing', username);
    });



    function isTyping(username) {
        typing.innerText = username + ' is typing...';
        if(!stopTyping) {
            stopTyping = true;
            setTimeout(function () {
                typing.innerText = '';
            }, 400)
        }
    }

    socket.on('typing', function (e) {
        clearTimeout(timer);
        isTyping(e);
        timer = setTimeout(function () {
            stopTyping = false;
            isTyping(e);
        }, 300);
    });

    socket.on('join', function (user, allUsers) {
      refreshUsersList(allUsers);
      addMessage({name: "System", message: `${capitalize(user.name)} has joined room...`})
    });

    socket.on('left', function ({users, leftUser}) {
        addMessage({name: "System", message: `${capitalize(leftUser.name)} has leaved the room...`});
       refreshUsersList(users);
    });

    socket.on('new room', function (users) {
        refreshRoomsList(users[username.toLowerCase()].rooms);
        try {
            socket.join(user.rooms[user.rooms.length - 1]);
        } catch   {
            console.warn("No rooms");
        }
    });

    socket.on('disconnected', function () {
        socket.emit('left chat', socket.id);
    });


    socket.on('connected', function (users, rooms) {
        // allUsers = users;
        // allRooms = rooms;
        refreshUsersList(users);
        refreshRoomsList(rooms);
    });

    socket.on('message', function (data) {
       addMessage(data);
    });

    window.socket = socket;


    function getCookie(name) {
        var matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function refreshRoomsList(rooms) {
        roomsList.innerHTML = '';
        rooms.forEach(room => {
            const newRoom = document.createElement('li');
            newRoom.innerText = room;
            roomsList.append(newRoom);
        })
    }

    function refreshUsersList(users) {
        usersList.innerHTML = '';
       for (let user in users) {
            const newUser = document.createElement('li');
            users[user].link = newUser;
            newUser.innerText = capitalize(users[user].name);
            if(users[user].online) {
                newUser.style.color = 'green';
                users[user].link.addEventListener('click', function(e) {
                    socket.emit('create room', users[user]);
                });
            } else {
                newUser.style.color = 'red';
            }
            usersList.append(newUser);
        }
    }

    function addMessage(data) {
        const {name, message} = data;
        const li = document.createElement('li');
        li.innerText = name + ':' + message;
        list.appendChild(li);
    }
});
