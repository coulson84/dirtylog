var socket = io();
var user = document.querySelector('#user').value;

socket.emit('register', user);

socket.on('log', function(msg){
	var li = document.createElement('li');
	var ul = document.querySelector('ul');
	li.innerHTML = msg;

	ul.appendChild(li);
});