const express = require('express')
const path = require('path')
const session = require('express-session')
const PORT = process.env.PORT || 5000

const { Pool } = require('pg');
userDB = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'users',
  password: 'power',
  port: 5432,
  //connectionString: process.env.HEROKU_POSTGRESQL_BRONZE_URL
});

const app = express();

app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(express.static(path.join(__dirname, 'public')))
app.use(session ({
    secret: 'splatsplatsplat',
    resave: false,
    saveUninitialized: false
  }))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => res.render('pages/index'))
app.get('/login', (req, res) => res.render('pages/login'))

app.post('/loginForm', (req, res) => {
    var query = `SELECT * FROM usr WHERE username = '${req.body.username}' AND password = '${req.body.password}'`;
    userDB.query(query, (err,result) => {
      if(result.rowCount > 0) {
        req.session.loggedin = true;
        req.session.username = req.body.username;
        var results = {'rows': result.rows};
        res.render('pages/loginSucceeded', results);
      } else {
        return res.render('pages/loginFailed');
      }
      res.end();
    })
  })

//If email is not provided I just put an empty string into database. Set the chess elo default to 1000.
app.post('/registerForm', (req, res) => {
    userDB.query(`SELECT username from usr WHERE username = '${req.body.username}'`, (err, result) => {
      if (result.rowCount > 0) {
        console.log("gottem");
        return res.render('pages/usernameTaken');
      } else {
        if(req.body.email){
          var email = req.body.email;
        } else {
          var email = '';
        }
        var query = `INSERT into usr (uid, username, email, chess_elo, password, admin) VALUES(DEFAULT, '${req.body.username}', '${email}',
          '1000', '${req.body.password}', 'false')`;
        userDB.query(query, (err,result) => {
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

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
