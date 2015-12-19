var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(9998);

function handler (req, res) {
  console.log(req.url);

  var pageUrl = __dirname + '/index.html';

  if(req.url == '/admin') {
    pageUrl = __dirname + '/admin.html';
  }

  fs.readFile(pageUrl,
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', function (socket) {
  socket.on('githubChanged', function (data) {
    io.sockets.emit('updateUsers', { res: data.delta });
  });
});