const express = require('express')
const path = require('path')
const session = require('express-session')
const PORT = process.env.PORT || 5000
const { Pool } = require('pg');
const db = new Pool({
	//connectionString: process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432'
	connectionString: process.env.DATABASE_URL||'postgres://postgres:root@localhost'
})

var bodyParser = require('body-parser');


const app = express();

app.use(session ({
  secret: 'splatsplatsplat',
  resave: false,
  saveUninitialized: false
}))
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

app.get('/', (req, res) => res.render('pages/login'))
app.get('/login', (req, res) => res.render('pages/login'))
app.get('/admin', (req, res) => {
  // check for admin rights
  if(req.session.loggedin) {
    if(req.session.admin) {
      res.render('pages/adminDashboard', {'results': -1})
    }
    else {
      res.send("Access Denied");
    }
  }
  else {
    return res.redirect('login');
  }
});
// catalog
var refresh_catalog = (req, res) => {
	let threadQuery = `SELECT * FROM Posts  WHERE p_thread_id = -1 ORDER BY p_post_id DESC`;
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
}
app.all('/catalog', bodyParser.urlencoded({extended:false}), refresh_catalog);

var refresh_catalog_personal = (req, res) => {
	let threadQuery = `SELECT * FROM Posts WHERE (p_username = any((select following from users where username='${req.session.username}')::text[])) AND p_thread_id = -1 ORDER BY p_post_id DESC`;
	db.query(threadQuery, (error, result) => {
		if(error){ res.send(error); return; }
		let data = {'rows':result.rows};
		res.render('pages/userView', data);
	});
}

app.all('/userView', bodyParser.urlencoded({extended:false}), refresh_catalog_personal);

app.get('/userView', (req,res) =>{
  console.log(req.session.loggedin)
  if(req.session.loggedin==true){
    console.log('logged in')
    var results = {'username': req.session.username};
    res.render('pages/userView',results)}
  else{
    res.render('pages/noAccess')
  }
})
app.get('/user_add', (req,res)=>{
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

app.post('/add-thread', bodyParser.urlencoded({extended:false}), (req, res)=>{
  if(!req.body['g-recaptcha-response']){
    res.send("captcha not filled, placeholder response, ajax resposne coming");
    return;
  }
	if(req.session.loggedin==false){ res.render('pages/noAccess'); return; }
	let data = {};
	// first, fetch the values needed for the thread table
	let tSubject = req.body.tSubject;
	if(!tSubject){tSubject = ""};
	let pUsername = req.session.username;
	let pText = req.body.pText;
	if(!pText)
		res.send("empty post");

	const query = `SELECT "post_thread"('${tSubject}', '${pUsername}', '${pText}') AS id`;

	db.query(query, (error, result) => {
		if(error){ res.send(error); return; }
		res.redirect('/thread/' + result.rows[0].id);
	});
});

app.get('/thread/:id', (req,res)=>{
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
});
app.post('/add-post/', bodyParser.urlencoded({extended:false}), (req, res) =>{
  function post_query(pThreadId, pUsername, pText){
    return new Promise(resolve => {
      const query = `SELECT "post_reply"(${pThreadId}, '${pUsername}', '${pText}') AS id`;
      console.log(query);
      db.query(query, (error, result) => {
        if(error){ res.send(error); return; }
        console.log("THIS: " + result.rows[0].id);
        resolve(result.rows[0].id);
      });
    })
  }

  async function reply_query(pThreadId, pUsername, pText){
    let pPostId = await post_query(pThreadId, pUsername, pText);
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

	if(req.session.loggedin==false){ res.render('pages/noAccess'); return; }

  if(!req.body['g-recaptcha-response']){
    res.send("captcha not filled, placeholder response, ajax resposne coming");
    return;
  }
	let data = {};
	let pThreadId = req.body.pThreadId;
	let pUsername = req.session.username;
	let pText = req.body.pText;
	if(!pText){
		res.send("empty post");
    return;
	}

  reply_query(pThreadId, pUsername, pText);
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
  db.query(`DELETE FROM Posts WHERE p_post_id = ${pid}`, (err, result) => {
    if(err){
      console.log("Invalid input")
      var results = {'results': -2};
      return res.render('pages/adminDashboard', results);
    }
    else if(result.rowCount > 0) {
      console.log(`Post removed: ${pid}`);
    }
    else {
      console.log(`Post not found: ${pid}`);
    }
    var results = {'results': result.rowCount};
    res.render('pages/adminDashboard', results);
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
    res.render('pages/adminDashboard', results);
  })
})

// TODO will need to update the database if we want to implement this one
app.post('/muteUser', (req, res)=> {
  var username = req.body.username;
  // db.query(`UPDATE User SET muted='t' WHERE username=${username}`, (err, result) => {
  //   if(result.rowCount > 0) {
  //     console.log(`User muted: ${username}`);
  //     var results = {'results': result.rowCount};
  //     res.render('pages/adminDashboard', results);
  //   }
  //   else {
  //     console.log(`Error muting user: ${username}`);
  //     var results = {'results': result.rowCount};
  //     res.render('pages/adminDashboard', results);
  //   }
  // })
  res.send("Database needs updating");
})

//TODO will need to update the database and add a check for banned usernames during login if we want to implement this one
app.post('/banUser', (req, res)=> {
  var username = req.body.username;
  // db.query(`UPDATE User SET banned='t' WHERE username=${username}`, (err, result) => {
  //   if(result.rowCount > 0) {
  //     console.log(`User banned: ${username}`);
  //     var results = {'results': result.rowCount};
  //     res.render('pages/adminDashboard', results);
  //   }
  //   else {
  //     console.log(`Error banning user: ${username}`);
  //     var results = {'results': result.rowCount};
  //     res.render('pages/adminDashboard', results);
  //   }
  // })
  res.send("Database needs updating");
})

app.post('/deleteUser', (req, res)=> {
  var username = req.body.username;
  db.query(`DELETE FROM Users WHERE username=${username}`, (err, result) => {
    if(err){
      console.log("invalid input");
      var results = {'results': -2};
      return res.render('pages/adminDashboard', results);
    }
    else if(result.rowCount > 0) {
      console.log(`User deleted: ${username}`);
    }
    else {
      console.log(`Error deleting user: ${username}`);
    }
    var results = {'results': result.rowCount};
    res.render('pages/adminDashboard', results);
  })
})

app.post('/updateAdmin', (req, res)=> {
  var username = req.body.username;
  if(req.body.update_admin == "Add"){
    var adminRights = 't';
  }
  else if(req.body.update_admin == "Remove"){
    var adminRights = 'f';
  }
  db.query(`UPDATE Users SET admin='${adminRights}' WHERE username=${username}`, (err, result) => {
    if(err){
      console.log("Invalid input");
      var results = {'results': -2};
      return res.render('pages/adminDashboard', results);
    }
    else if(result.rowCount > 0) {
      console.log(`Admin rights updated: ${username}`);
    }
    else {
      console.log(`Error updating admin rights: ${username}`);
    }
    var results = {'results': result.rowCount};
    res.render('pages/adminDashboard', results);
  })
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

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
