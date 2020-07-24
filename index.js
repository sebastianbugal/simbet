const express = require('express'),
  http = require('http');
const path = require('path')
const ses = require('express-session')
// const http=require('http').Server(express);
const { Chess } = require('./public/js/chess.js')
const PORT = process.env.PORT || 3000
const { Pool } = require('pg');

const db = new Pool({
	//connectionString: process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432'
	connectionString: process.env.DATABASE_URL||'postgres://postgres:root@localhost:5432'
})
var fen;
const fetch = require('node-fetch');

var bodyParser = require('body-parser');

const app = express();
var server = http.createServer(app);
const io = require('socket.io').listen(server);
var session=ses ({
  secret: 'splatsplatsplat',
  resave: false,
  saveUninitialized: true
})
app.use(session)
io.use(function (socket, next) {
  session(socket.request, socket.request.res, next);
});
// const sharedsession = require("express-socket.io-session");
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(express.static(path.join(__dirname, 'public')))
app.use(function (req, res, next) {
  console.log(req.session);
  res.locals.session = req.session;   // session available in ejs
  next();
})
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

const Twitter = require('twitter');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

var t_client = new Twitter({
  consumer_key: process.env.TWITTER_API_KEY,
  consumer_secret: process.env.TWITTER_API_SECRET_KEY,
  bearer_token: process.env.TWITTER_BEARER_TOKEN
});

app.get('/leaderBoards', (req, res) => {   // will get rate limited if more than 450 refreshes every 15 mins
  t_client.get('search/tweets', {q: '#SplatForum', count:'5', include_entities:'true'}, function(error, tweets, response) {
    if(error) throw error;
    var tweets = {'statuses':tweets.statuses};
    var query = `SELECT * FROM users ORDER BY chess_elo DESC`;
    db.query(query, (err, result) => {
      if(err){
        res.send(error);
      }
      var data = {'rows':result.rows, tweets};
      res.render('pages/leaderBoards', data);
    })
  });
})


app.get('/', (req, res) => res.render('pages/login'))

app.get('/login', (req, res) => res.render('pages/login'))

app.all('/admin', (req, res) => {
  // check for admin rights
  if(req.session.loggedin) {
    if(req.session.role == 'm' || req.session.role == 'a') {
      let data = {};
      data['results'] = -1;
      const query = `SELECT * FROM Reports r, Posts p WHERE r.r_post_id = p.p_post_id ORDER BY r.r_report_id ASC`;
      db.query(query, (error, result) => {
        if(error){res.send(error); return;}
        data['reports'] =  result.rows;
        res.render('pages/adminDashboard', data);
      });
      /*
      const query2 = `SELECT * FROM Users`;
      db.query(query2, (error, result) => {
        if(error){res.send(error); return;}
        data['users'] =  result.rows;
        console.log(result.rows);
      });
      */
    }
    else {
      res.send("Access Denied");
    }
  }
  else {
    return res.redirect('login');
  }
});

app.get('/chat',(req,res)=>{
  if(req.session.loggedin){
  res.render('/userView');}
  else{
    res.redirect('login');
  }
})
// catalog
// Catalog will now only show posts where the user is within the accessible forum
var refresh_catalog = (req, res) => {
  if(req.session.loggedin){
  	let threadQuery = `SELECT * FROM Posts  WHERE p_thread_id = -1
  	AND (t_forum = any((select accessible from users where username='${req.session.username}')::text[])) ORDER BY p_post_id DESC`;
  	db.query(threadQuery, (error, result) => {
  		if(error){ res.send(error); return; }
  		let data = {'rows':result.rows};
  		if(req.session.loggedin)
  			data['username'] = req.session.username;
  		else
  			data['username'] = "";
  		console.log(result.rows);
  		res.render('pages/catalog.ejs', data);
  	});
  } else {
    res.redirect('login');
  }
}
app.all('/catalog', bodyParser.urlencoded({extended:false}), refresh_catalog);

var refresh_catalog_personal = (req, res) => {
  if(req.session.loggedin){
  	let threadQuery = `SELECT * FROM Posts WHERE (p_username = any((select following from users where username='${req.session.username}')::text[]))
  	AND p_thread_id = -1 AND (t_forum = any((select accessible from users where username='${req.session.username}')::text[])) ORDER BY p_post_id DESC`;
  	db.query(threadQuery, (error, result) => {
  		if(error){ res.send(error); return; }
  		let data = {'rows':result.rows};
  		res.render('pages/userView', data);
  	});
  } else {
    res.redirect('login');
  }
}

app.all('/userView', bodyParser.urlencoded({extended:false}), refresh_catalog_personal);

app.get('/userView', (req,res) =>{
  console.log(req.session.loggedin)
  if(req.session.loggedin==true){
    console.log('logged in')
    var results = {'username': req.session.username};
    res.render('pages/userView',results)}
  else{
    res.redirect('login');
  }
})
app.get('/user_add', (req,res)=>{
  if(req.session.loggedin){
    query=`SELECT following FROM users WHERE username='${req.session.username}'`
    db.query(query, (err,result) => {
      if(err){
        console.log(err);
        res.redirect('/')
      }
      else{
        console.log(result.rows[0].following)
        fol=result.rows[0].following
        res.render('pages/search',fol)
      }
    })
  }
  else{
    res.redirect('login');
  }
})

app.post('/add_user', (req,res)=>{
  var searchVal=req.body.searchVal;
  query=`select username from users where username='${searchVal}'`
  db.query(query, (err,result) => {
    console.log(result)
    if(result.rowCount>=1){
      update=`UPDATE users SET following=array_append(following, '${searchVal}') where username='${req.session.username}' AND NOT ('${searchVal}'=any(following))`;
      db.query(update,(err,result)=>{
        if(err){
          console.log(err)
          res.redirect('/userView')
        }
        else{
          console.log(result)
          res.redirect('/userView')
        }
      });
    }
    else{
      console.log('nothing found')
      res.redirect('/userView')
    }
  })
})

app.post('/unfollow', (req,res)=>{
  unfollow=req.body.unfollow;
  update=`UPDATE users SET following=array_remove(following, '${unfollow}') where username='${req.session.username}'`;
  db.query(update, (error, result) => {
    if(error){
      console.log(error)
      res.redirect('/userView');
    }
    else{
      console.log(result);
      res.redirect('/userView')
    }
  })

  console.log(unfollow);
})

app.post('/feed', (req,res)=>{

});

//Create forum with password. Admin users gain access to all things.
app.post('/create_forum', (req,res)=> {
	forumName = req.body.forumName;
	forumPassword = req.body.forumPassword
	owner = req.session.username;
	db.query(`SELECT f_name from forums WHERE f_name = '${forumName}'`, (err, result) => {
		if (result.rowCount > 0) {
			return res.send(`Forum name already taken, contact forum owner '${owner}' to be allowed access.`);
		} else {
			const query = `INSERT INTO Forums(f_name, f_password, f_owner) VALUES ('${forumName}', '${forumPassword}', '${owner}')`;
			db.query(query, (err, result) => {
				if(err){res.send(err); return; }
				update=`UPDATE users SET accessible=array_append(accessible, '${req.body.forumName}') where (username='${req.session.username}' OR role = 'a') AND NOT ('${req.body.forumName}'=any(accessible))`;
	      db.query(update,(err,result)=>{
					console.log(result)
	        if(err){
	          res.send(err);
	        }
	        else{
	          res.redirect('/catalog');
	        }
	      });
			})
		}
	})
});

//Need password to access a forum. Might eventually add invites as well through direct messages?
app.post('/access_forum', (req,res)=> {
	var query = `SELECT * FROM Forums WHERE f_name = '${req.body.forumName}' AND f_password = '${req.body.forumPassword}'`;
	db.query(query, (err,result) => {
		if(result.rowCount > 0) {
      update=`UPDATE users SET accessible=array_append(accessible, '${req.body.forumName}') where username='${req.session.username}' AND NOT ('${req.body.forumName}'=any(accessible))`;
      db.query(update,(err,result)=>{
				console.log(result)
        if(err){
          res.send(`Cannot access this forum, you may already be able to access it`);
        }
        else{
          console.log(result)
          res.redirect('/catalog')
        }
      });
    }
    else{
      return res.send('Incorrect forum name or password');
    }
  })
});

app.get('/rules', (req,res)=>{
  res.render('pages/rules.ejs');
});

app.post('/add-thread', bodyParser.urlencoded({extended:false}), (req, res)=>{
  if(!req.body['g-recaptcha-response']){
    res.send("captcha not filled, placeholder response, ajax resposne coming");
    return;
  }
  if(req.session.loggedin==false){ res.render('pages/noAccess.ejs'); return; }
  let data = {};
  // first, fetch the values needed for the thread table
  let tSubject = req.body.tSubject;
  if(!tSubject){tSubject = ""};
  let tForum = req.body.tForum;
  if(!tSubject){tForum = "main"};
  let pUsername = req.session.username;
  let pText = req.body.pText;
  if(!pText)
    res.send("empty post");

  db.query(`SELECT * FROM Users WHERE username = '${pUsername}' AND ('${tForum}' = any(accessible))`, (error, result) => {
    if(error){ res.send(error); return; }
    //Checks to see if the User can access the forum they are posting to.
    if(result.rowCount > 0) {
      const query = `SELECT "post_thread"('${tSubject}', '${tForum}', '${pUsername}', '${pText}') AS id`;
      db.query(query, (error, result) => {
        if(error){ res.send(error); return; }
        res.redirect('/thread/' + result.rows[0].id);
      });
    } else {
      res.redirect('/catalog/');
    }
  })
});

app.get('/thread/:id', (req,res)=>{
  if(req.session.loggedin){
    let data = {};
    let id = req.params.id;
    const query = `SELECT * FROM Posts p LEFT JOIN Replies r ON r.parent_id = p.p_post_id WHERE p.p_thread_id = ${id} OR (p.p_thread_id = -1 AND p.p_post_id = ${id}) ORDER BY p.p_post_id ASC, r.reply_id ASC`;
    db.query(query, (error, result) => {
      if(error){ res.send(error); return; }
      data['posts'] =  result.rows;
      data['username'] = "";
      if(req.session.loggedin == true){
        data['username'] = req.session.username;
        data['role'] = req.session.role;
      }
      //console.log(result.rows);
      res.render('pages/thread.ejs', data);
    });
  }
  else{
    res.redirect('/login');
  }
});


app.get('/report-post/:id', (req, res)=>{
  let data = {};
  data['p_post_id'] = req.params.id;

  res.render('pages/reportPost.ejs', data);
});

app.post('/send-report', bodyParser.urlencoded({extended:false}), (req, res)=>{
  if(req.session.loggedin==false){ res.render('pages/noAccess.ejs'); return; }
  if(!req.body['g-recaptcha-response']){
    res.send("captcha not filled, placeholder response, ajax resposne coming");
    return;
  }
  let data = {};
  data['pPostId'] = req.body.rPostId;
  let rRule = req.body.rRule;
  if(req.body.reason == "law"){
    rRule = req.body.reason;
  }
  let rPostId = req.body.rPostId;
  let rUsername = req.session.username;
  data['p_post_id'] = req.params.id;
  const query = `INSERT INTO Reports(r_rule, r_post_id, r_username) VALUES('${rRule}', '${rPostId}', '${rUsername}')`;
  console.log(query);
  db.query(query, (error, result) => {
    if(error){res.send(error); return;}
  });

  res.render('pages/reportSent.ejs', data);
});

app.post('/add-post/', bodyParser.urlencoded({extended:false}), (req, res) =>{
  function post_query(pThreadId, pUsername, pText, pCountryCode){
    return new Promise(resolve => {
      const query = `SELECT "post_reply"(${pThreadId}, '${pUsername}', '${pText}', '${pCountryCode}') AS id`;
      console.log(query);
      db.query(query, (error, result) => {
        if(error){ res.send(error); return; }
        console.log("THIS: " + result.rows[0].id);
        resolve(result.rows[0].id);
      });
    })
  }

  async function reply_query(pThreadId, pUsername, pText, pCountryCode){
    let pPostId = await post_query(pThreadId, pUsername, pText, pCountryCode);
    const replyRegex = />>[0-9]+/g;
    const replyingTo = pText.match(replyRegex);
    let replyingToSet = new Set(replyingTo);
    let replyQuery = "INSERT INTO Replies(parent_id, reply_id) VALUES($1, $2)";
    replyingToSet.forEach((parentId) => {
      console.log("REPLYING TO:" + parentId.slice(2) + " FROM:" + pPostId);
      db.query(replyQuery, [parentId.slice(2), pPostId], (error, result) => {
        //if(error){res.send(error); return;}
      });
    })
  }

  if(req.session.loggedin==false){ res.render('pages/noAccess.ejs'); return; }

  if(!req.body['g-recaptcha-response']){
    res.send("captcha not filled, placeholder response, ajax resposne coming");
    return;
  }
  let pThreadId = req.body.pThreadId;
  let pUsername = req.session.username;
  let pText = req.body.pText;
  if(!pText){
    res.send("empty post");
    return;
  }

  //get ip
  let ipApiData = {};
  ipApiData['countryCode'] = "AX";
  console.log("ip: " + req.ip);
  let ip = req.ip;
  let settings = {method:"Get"};
  const ipApiUrl = `http://ip-api.com/json/${ip}?fields=countryCode`;
  fetch(ipApiUrl, settings)
    .then((res) => res.json())
    .then((json) => {
      if(json['countryCode'])
        ipApiData['countryCode'] = json['countryCode'];
      console.log(json['countryCode']);
      console.log(ipApiUrl);
    });
  console.log("countryCode: " + ipApiData['countryCode']);

  reply_query(pThreadId, pUsername, pText, ipApiData['countryCode']);
  // regular expression to limit consecutive line breaks to two
  pText = pText.replace(/\n\s*\n\s*\n/g, '\n\n');
  res.redirect('/thread/'+pThreadId);
});

app.post('/loginForm', (req, res) => {
    var query = `SELECT * FROM users WHERE username = '${req.body.username}' AND password = '${req.body.password}'`;
    db.query(query, (err,result) => {
      if(result.rowCount > 0) {
        req.session.loggedin = true;
        req.session.username = req.body.username;
        req.session.role = result.rows[0]['role'];
        var results = {'username': req.session.username};
        console.log(results)
        res.redirect('userView');
      } else {
        return res.render('pages/loginFailed');
      }
      res.end();
    })
  })

app.post('/back-forum', (req,res)=>{
  console.log('redirect to catalog')
  res.redirect('/catalog')
})

//If email is not provided I just put an empty string into database. Set the chess elo default to 1000.
app.post('/registerForm', (req, res) => {
    db.query(`SELECT username from users WHERE username = '${req.body.username}'`, (err, result) => {
      if (result.rowCount > 0) {
        return res.render('pages/usernameTaken');
      } else {
        if(req.body.email){
          var email = req.body.email;
        } else {
          var email = '';
        }
    var query = `INSERT into users (username, email, password) VALUES('${req.body.username}', '${email}', '${req.body.password}')`;
        db.query(query, (err,result) => {
          if(result) {
            console.log("Successful registration.");
            res.redirect('/login');
          } else if (err){
            res.render('pages/userNameTaken');
          } else {
            res.send("This register has failed idk why.");
          }
          return;
        })
      }
    })
})

// admin posts
app.post('/deletePost', (req, res)=> {
  var pid = req.body.pid;
  db.query(`SELECT FROM "delete_post"(${pid})`, (err, result) => {
    if(err){
      console.log("Invalid input")
      var results = {'results': -2};
      res.redirect('/admin');
      return;
      //return res.render('pages/adminDashboard', results);
    }
    else if(result.rowCount > 0) {
      console.log(`Post removed: ${pid}`);
    }
    else {
      console.log(`Post not found: ${pid}`);
    }
    var results = {'results': result.rowCount};
    //res.render('pages/adminDashboard', results);
    res.redirect('/admin');
  })
})

app.post('/lockThread', (req, res)=> {
  var pid = req.body.pid;
  db.query(`UPDATE Posts SET t_active='f' WHERE p_post_id=${pid}`, (err, result) => {
    if(err){
      console.log("Invalid input");
      var results = {'results': -2};
      return res.render('pages/adminDashboard', results);
    }
    else if(result.rowCount > 0) {
      console.log(`Thread Locked: ${pid}`);
    }
    else {
      console.log(`Error locking thread: ${pid}`);
    }
    var results = {'results': result.rowCount};
    //res.render('pages/adminDashboard', results);
    res.redirect('/admin');
  })
})


app.post('/deleteUser', bodyParser.urlencoded({extended:false}), (req, res)=> {
  var username = req.body.username;
  db.query(`SELECT FROM "delete_user"('${username}')`, (err, result) => {
    if(err){
      console.log("invalid input");
      var results = {'results': -2};
      //return res.render('pages/adminDashboard', results);
    }
    else if(result.rowCount > 0) {
      console.log(`User deleted: ${username}`);
    }
    else {
      console.log(`Error deleting user: ${username}`);
    }
    //var results = {'results': result.rowCount};
    //res.render('pages/adminDashboard', results);
    res.redirect('/admin');
  })
})

app.post('/updateAdmin', bodyParser.urlencoded({extended:false}), (req, res)=> {
  db.query(`UPDATE Users SET role='${req.body.role}' WHERE username='${req.body.username}'`, (err, result) => {
    if(err){
      res.send("Invalid input");
      console.log("Invalid input");
      var results = {'results': -2};
      return;
      //return res.render('pages/adminDashboard', results);
    }
    /*
    else if(result.rowCount > 0) {
      console.log(`Role updated for: ${username}`);
    }
    else {
      console.log(`Error updating roles: ${username}`);
    }
    //var results = {'results': result.rowCount};
    //res.render('pages/adminDashboard', results);*/
    res.redirect('/admin');
  })
})


app.all('/users', (req,res)=>{
  db.query(`SELECT * FROM users`, (error, result)=>{
    if(error){ res.send(error) };
    res.render('pages/users.ejs', {'users': result.rows});
  })
});

var chess = new Chess()

var players=[];
var bid;
var wid;
io.on('connection', socket=>{
  var req = socket.request;
  //chat
  socket.on('username', function(username) {
    socket.username = req.session.username;
    io.emit('is_online', '🔵 <i>' + socket.username + ' join the chat..</i>');
  });

  socket.on('disconnect', function(username) {
    io.emit('is_online', '🔴 <i>' + socket.username + ' left the chat..</i>');
  })

  socket.on('chat_message', function(message) {
    io.emit('chat_message', '<strong>' + socket.username + '</strong>: ' + message);
  });

  //chatt

  socket.on('reset',data=>{
    chess=new Chess();
    socket.to('chess_room').emit('fen',chess.fen());
    wid=null
    bid=null
  })
  socket.on('join_room',data=>{
    if(wid==null){
      wid=socket.id
    }
    else if(bid==null){
      bid=socket.id
    }
  socket.join('chess_room');
    console.log('user',socket.id,'joined')
    console.log(wid,bid)
    var side;
    console.log('wid is: ',wid,'id gotten: ',socket.id);
    if(wid==socket.id){
      console.log('wid is: ',wid,'id gotten: ',socket.id);
      side='white';}
    else if(bid==socket.id){
      console.log('bdi is: ',bid,'id gotten: ',socket.id);
      side='black'}

    var data=[req.session.username,side]
    io.to('chess_room').emit('user_name',data)
    console.log(data)

  })
  socket.on('start',function(){
    console.log('working')

  })

  // io.sockets.to('chess_room').on('start',function(){
  //   chess = new Chess()
  //   console.log('working')
  // })
  // io.sockets.emit('fen',chess.fen());
  socket.on('drag_start',data=>{

    if(chess.game_over()){
      socket.to('chess_room').emit('game_over',true);
    }

    if((chess.turn()==='w'&& data.search(/^b/) !== -1 && wid==socket.id)){
      console.log(true);
      socket.to('chess_room').emit('side',true);
    }
    else{


      socket.to('chess_room').emit('side',true)
    }
    if((chess.turn() === 'b' && data.search(/^w/) !== -1 && bid==socket.id)){
      socket.to('chess_room').emit('side',true)
      console.log(false);

       }
    else{
      socket.to('chess_room').emit('side',true);


    }
      })

  socket.on('move', data=>{

    var status = ''
    var moveColor = 'White'
    console.log(socket.id, wid)
    if (chess.turn() === 'b' && socket.id==bid){
      console.log(bid)
      moveColor = 'Black'
      chess.move(data);

    }
    else if(chess.turn() === 'w' && socket.id==wid){
      console.log(wid)
      moveColor = 'white'
      chess.move(data);


    }
    io.to('chess_room').emit('fen',chess.fen());

    // checkmate?
    if (chess.in_checkmate()) {
      status = 'Game over, ' + moveColor + ' is in checkmate.'
    }

    // draw?
    else if (chess.in_draw()) {
      status = 'Game over, drawn position'
    }

    // game still on
    else {
      status = moveColor + ' to move'

      // check?
      if (chess.in_check()) {
        status += ', ' + moveColor + ' is in check'
      }
    }
    console.log(chess.fen())
    socket.to('chess_room').emit('fen',chess.fen());
  })

});


app.get('/games',(req,res)=>{
  if(req.session.loggedin){
  res.render('pages/games');}
  else{
    res.redirect('login');
  }
});

app.get('/chess', (req,res)=>{
  if(req.session.loggedin){
  res.render('pages/chess')
  }
  else{
    res.redirect('login');
  }
})
app.get('/logout',function(req,res){
    req.session.destroy((err) => {
        if(err){
            console.log("Error has occured");
        } else {
            res.redirect('/login');
        }
    });

});
server.listen(PORT, () => console.log(`Listening on ${ PORT }`));
// app.listen(PORT, () => console.log(`Listening on ${ PORT }`))