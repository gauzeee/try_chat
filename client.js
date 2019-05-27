import io from 'socket.io-client';
document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const chat = document.querySelector('.chat');
    const form = chat.querySelector('form');
    const list = chat.querySelector('ul');
    const input = form.querySelector('input');
    const username = getCookie('username');
    const typing = chat.querySelector('#typing');
    const title = chat.querySelector('h1');
    const usersList = document.getElementById('users-list');
    const roomsList = document.getElementById('rooms-list');
    let stopTyping = true;
    let timer = null;
    let allUsers = {};
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

    const evt = new KeyboardEvent('keypress', {"key": 'a'});

    const type = setInterval(function () {
        input.focus();
        input.value += 't';
        input.dispatchEvent(new Event('input'));
    }, 300);
    setTimeout(function () {
        clearTimeout(type)
    }, 30000)


    function isTyping(usersArray) {
        const users = usersArray.filter(function (user) {
           if(user !== username) return user;
        });
        const len = users.length;
        console.log(users);
        let str = users.reduce(function (acc, currentValue, index) {
            if(index < 2) {
               return acc = `${acc}, ${currentValue}`;
            }
            return acc = `${acc}`;
        });

        if (len > 2) {
            str += ` and ${len - 2}`
        }

        if (len > 1) {
            str += ' are typing...'
        } else {
            str += ' is typing...'
        }
        typing.innerText = str;

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

    socket.on('join', function (user) {
      allUsers[user.name] = user;
      refreshUsersList(allUsers);
      addMessage({name: "System", message: `${user.name} has joined room...`})
    });

    socket.on('left', function (leftUser) {
        addMessage({name: "System", message: `${leftUser} has leaved the room...`});
        allUsers[leftUser].online = false;
       refreshUsersList(allUsers);
    });

    socket.on('new room', function (users) {
        refreshRoomsList(users[username].rooms);
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
        allUsers = users;
        // allRooms = rooms;
        console.log(arguments);
        refreshUsersList(allUsers);
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
            newUser.innerText = users[user].name;
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
