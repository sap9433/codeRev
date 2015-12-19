var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(9998);

var leaderBoardDb = {
  'prs': {},
  'users': {}
};

function handler(req, res) {
  console.log(req.url);

  var pageUrl = __dirname + '/index.html';

  if (req.url == '/admin') {
    pageUrl = __dirname + '/admin.html';
  }

  // Git hub payload received . Sent on http://7b0160d4.ngrok.io -> localhost:9998
  // Change this in gitHub hook as you change wifi/network.
  if (req.url == '/payload') {
    handleLeaderBoardLogic(req);
  }

  fs.readFile(pageUrl,
    function(err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      res.writeHead(200);
      res.end(data);
      io.sockets.emit('updatePrs', {
        res: leaderBoardDb
      });
    });
}

io.on('connection', function(socket) {
  socket.on('githubChanged', function(data) {
    io.sockets.emit('updateUsers', {
      res: data.delta
    });
  });
});

var handleLeaderBoardLogic = function(req) {
  req.on('data', function(chunk) {
    var load = JSON.parse(chunk.toString());
    if ((thisPr = load.pull_request) && load.action == 'opened') {
      leaderBoardDb['prs'][thisPr.html_url] = {
        title: thisPr.title,
        openedBy: thisPr.user.login,
        created: thisPr.created_at,
        reviewedBy: []
      }
    } else if ((thisCom = load.comment)) {
      var reviewDone = thisCom.body == 'lgtm' && thisCom.action == 'created';
      if (reviewDone) {
        var reviewer = thisCom.user.login;
        var refPull = load.issue.pull_request.html_url;
        leaderBoardDb.prs[refPull].reviewedBy.push(reviewer);
        leaderBoardDb.users[reviewer].push(refPull);
      }
    }
  });
}
