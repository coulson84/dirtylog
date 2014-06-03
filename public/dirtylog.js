var socket = io();
var user = document.querySelector('#user').value;
var ul = document.querySelector('ul');
var clear = document.querySelector('#clear');

socket.emit('register', user);

socket.on('log', function(msg){
	var li = document.createElement('li');
	li.innerText = msg;

	ul.appendChild(li);
	ul.scrollTop = ul.scrollHeight;
});

socket.on('clear', function(){
	ul.innerHTML = '';
});


ul.scrollTop = ul.scrollHeight;

clear.addEventListener('click', function(){
	socket.emit('clear', user);
	ul.innerHTML = '';
}, false);