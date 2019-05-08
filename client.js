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
    let stopTyping = true;
    let timer = null;


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

    socket.on('join', function (users) {
      refreshUsersList(users);
      addMessage({name: users[users.length-1].username, message: "has joined room..."})
    });

    socket.on('left', function (data) {
        let leftedUser, onLine;
        data.users.forEach(user => {
          if(user.id === data.id) {
              leftedUser = user;
          }  else {
              onLine.push(user);
          }
        });
        addMessage({name: leftedUser.username, message: "has leaved the room..."});
       refreshUsersList(onLine);
    });

    socket.on('disconnected', function () {
        socket.emit('left chat', socket.id);
    });


    socket.on('connected', function (arr) {
        console.log(arr);
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

    function refreshUsersList(users) {
        usersList.innerHTML = '';
        users.forEach((user) => {
            const newUser = document.createElement('li');
            newUser.innerText = user.username;
            usersList.append(newUser);
        })
    }

    function addMessage(data) {
        const {name, message} = data;
        const li = document.createElement('li');
        li.innerText = name + ':' + message;
        list.appendChild(li);
    }
});
