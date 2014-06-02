var socket = io();
var user = document.querySelector('#user').value;
var ul = document.querySelector('ul');
var clear = document.querySelector('#clear');

socket.emit('register', user);

socket.on('log', function(msg){
	var li = document.createElement('li');
	li.innerHTML = msg;

	ul.appendChild(li);
	ul.scrollTop = ul.scrollHeight;
});


ul.scrollTop = ul.scrollHeight;

clear.addEventListener('click', function(){
	socket.emit('clear', user);
	ul.innerHTML = '';
}, false);