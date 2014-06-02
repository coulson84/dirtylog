var express = require('express');
var app = express();
var router = express.Router();

var socket = require('socket.io')

var redis  = require('redis');
var redisHost = process.env.OPENSHIFT_REDIS_HOST || null;
var redisPort = process.env.OPENSHIFT_REDIS_PORT || null;
var auth = process.env.REDIS_PASSWORD ? {auth_pass : process.env.REDIS_PASSWORD} : null;
var client = redis.createClient(redisPort, redisHost, auth);

var io;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

router.param('user', function(req, res, next, id){
  req.user = id;
  next();
});

// router.param('info', function(req, res, next, data){
// 	req.data = req.url.substr(req.url.indexOf(data));
// 	next();
// });

router.get('/:user', function(req, res, next) {
  var user = {name : req.user};
  
  client.lrange(req.user, 0, -1, function(err, data){
  	user.list = data;
  	res.render('user', { user: user, host: req.host, protocol:req.protocol});
  });
});


router.use('/public', express.static(__dirname + '/public'));

router.use(function(req, res){
  var info = /log\/\w+?\/.*$/;
  if(info.test(req.url)){
    getInfo(req.url);
    res.end();
  }else if(req.url !== '/'){
    res.status('404');
    res.send('404');
  }else{
    res.render('index', {host: req.host, protocol:req.protocol});
  }	
});


app.use(router);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

var server = app.listen(server_port, server_ip_address, function() {
    console.log('Listening on port %d', server.address().port);
});

io = socket(server);
var usersListening = {};

io.on('connection', function(socket){
  socket.on('register', function(id){
  	usersListening[id] = socket;
  });

  socket.on('clear', function(id){
    if(socket === usersListening[id]){
      client.del(id);
    }
  });
});

function getInfo(url){
  var info = /log\/(\w+?)\/(.*)$/;
  var matches = url.match(info);
  var user = matches[1];
  var data = decodeURIComponent(matches[2]);
  addInfo(user, data);
}

function addInfo(user, data){
  client.rpush(user, data);
  emitLog(user, data);
}


function emitLog(user, data){
	if(typeof usersListening[user] === 'undefined'){
		return;
	}

	usersListening[user].emit('log', data);
}