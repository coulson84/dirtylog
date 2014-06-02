var express = require('express');
var app = express();
var router = express.Router();

var redis  = require('redis');
var client = redis.createClient();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

router.param('user', function(req, res, next, id){
  req.user = id;
  next();
});

router.param('info', function(req, res, next, data){
	req.data = data;
	next();
});

router.get('/:user', function(req, res, next) {
  var user = {name : req.user};
  
  client.lrange(req.user, 0, -1, function(err, data){
  	user.list = data;
  	res.render('index', { user: user });
  });
});

router.get('/log/:user/:info', function(req, res, next){
	client.rpush(req.user, req.data);
	res.send('');
});

router.use(function(req, res){
	res.send('nope nope nope');
});


app.use(router);

var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});