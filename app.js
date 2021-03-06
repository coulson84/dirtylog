var express = require('express');
var app = express();
var router = express.Router();

var socket = require('socket.io');

var redis  = require('redis');
var redisHost = process.env.OPENSHIFT_REDIS_HOST || null;
var redisPort = process.env.OPENSHIFT_REDIS_PORT || null;
var auth = process.env.REDIS_PASSWORD ? {auth_pass : process.env.REDIS_PASSWORD} : null;
var client = redis.createClient(redisPort, redisHost, auth);

var isConnected = false;

client.on('connect', function(){
  console.log('connected to database');
  isConnected = true;
});

client.on('error', function(){
  console.log('an error occured with the DB');
  isConnected = false;
});


var usersListening = {};
var io;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

router.param('user', function(req, res, next, id){
  req.user = id;
  next();
});

router.use('/public', express.static(__dirname + '/public'));
router.get('/report', function(req, res){
  res.render('report', {report: usersListening});
});

router.get('/:user', function(req, res, next) {
  var user = {name : req.user};

  client.lrange(req.user, 0, -1, function(err, data){
    if(err){
      user.list = [];
    }else{
  	 user.list = data;
    } 
  	res.render('user', { user: user, host: req.host, protocol:req.protocol, error:!!err});
  });
});

router.use(function(req, res){
  var info = /log\/.+?\/.*$/;
  if(info.test(req.url)){
    getInfo(req.url);
    res.set('Cache-Control:', 'no-store, no-cache, must-revalidate')
    res.end();
  }else if(req.url !== '/'){
    res.status('404');
    res.send('404');
  }else{
    console.log('db:' + (isConnected?'connected':'error'));
    res.render('index', {host: req.host, protocol:req.protocol, db:isConnected});
  }
});


app.use(router);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

var server = app.listen(server_port, server_ip_address, function() {
    console.log('Listening on port %d', server.address().port);
});

io = socket(server);


io.on('connection', function(socket){
  var key = null;
  socket.on('register', function(id){
    if(typeof usersListening[id] === 'undefined'){
      usersListening[id] = [];
    }
  	usersListening[id].push(socket);
    key = id;
  });

  socket.on('clear', function(id){
    if(usersListening[id].some(function(s){return s === socket;})){
      client.del(key);
      usersListening[key].forEach(function(s){
        s.emit('clear');
      });
    }
  });

  socket.on('disconnect', function () {
    if(typeof usersListening[key] === 'undefined'){
      return;
    }

    usersListening[key] = usersListening[key].filter(function(s){
      return s !== socket;
    });
  });
});

function getInfo(url){
  var info = /log\/(.+?)\/(.*)$/;
  var matches = url.match(info);
  var user = decodeURIComponent(matches[1]);
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

	usersListening[user].forEach(function(socket){socket.emit('log', data);});
}
