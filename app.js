var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var exec = require('child_process').exec;


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
    try {
      var load = JSON.parse(chunk.toString());
    } catch (e) {
      console.log(e);
      return;
    }
    if ((thisPr = load.pull_request) && load.action == 'opened') {
      leaderBoardDb['prs'][thisPr.html_url] = {
        title: thisPr.title,
        openedBy: thisPr.user.login,
        created: thisPr.created_at,
        reviewedBy: []
      };
      console.log(exec);
      exec('curl --header "Authorization: key=AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ" --header Content-Type:"application/json" https://android.googleapis.com/gcm/send -d "{\"registration_ids\":[\"e93gZ-qIviM:APA91bGFq1b0PBtYG7YvwFa2sA74IJZOSeHCXg_BZE-iWYL1rfZjGXbcqmWw3aL0eGZyfk7dhY9MnULjncR_ragGnozCeZ71nBl_pCc6cw4BY6xVTd8noeM0kfZW-ckY4vcDrsJdJLre\"]}"');
    } else if ((thisCom = load.comment)) {
      var reviewDone = thisCom.body == 'lgtm' && load.action == 'created';
      if (reviewDone) {
        var reviewer = thisCom.user.login;
        var refPull = load.issue.pull_request.html_url;
        leaderBoardDb.prs[refPull].reviewedBy.push(reviewer);
        if (!leaderBoardDb.users[reviewer]) {
          leaderBoardDb.users[reviewer] = {
            name: reviewer,
            score: 1
          };
        } else {
          leaderBoardDb.users[reviewer].score = leaderBoardDb.users[reviewer].score + 1;
        }
      }
    }
  });
}
