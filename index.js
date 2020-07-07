const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const { Pool } = require('pg');
const db = new Pool({
	connectionString: process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/splat'
})
var bodyParser = require('body-parser');
const app = express();


app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${ PORT }`))

// catalog
var refresh_catalog = (req, res) => {
	let threadQuery = `SELECT * FROM Posts  WHERE p_thread_id = -1 ORDER BY p_post_id DESC`;
	db.query(threadQuery, (error, result) => {
		if(error){ res.send(error); return; }
		let data = {'rows':result.rows};
		res.render('pages/catalog.ejs', data);
	});
}
app.all('/catalog', bodyParser.urlencoded({extended:false}), refresh_catalog);

app.post('/add-thread', bodyParser.urlencoded({extended:false}), (req, res)=>{
	let data = {};
	// first, fetch the values needed for the thread table
	let tSubject = req.body.tSubject;
	if(!tSubject){tSubject = ""};
	let pUsername = req.body.pUsername;
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
	const query = `SELECT * FROM Posts p WHERE p.p_thread_id = ${id} OR p.p_post_id = ${id} ORDER BY p.p_post_id;`;
	db.query(query, (error, result) => {
		if(error){ res.send(error); return; }
		data['posts'] =  result.rows;
		//console.log(result.rows);
		res.render('pages/thread.ejs', data);
	});
});

app.post('/add-post/', bodyParser.urlencoded({extended:false}), (req, res) =>{
	let data = {};
	let pThreadId = req.params.pThreadId;
	let pUsername = req.params.pUsername;
	let pText = req.params.pText;
	const query = `INSERT INTO Posts(p_thread_id, p_username, p_text) VALUES(${pThreadId}, '${pUsername}', '${pText}')`;
	db.query(query, (error, result) => {
		if(error){ res.send(error); return; }
	});
});

