var chai = require('chai');
var chaihttp = require('chai-http');
var server = require('../index');
var should = chai.should();
var request = require('supertest');

chai.use(chaihttp);

describe("Testing login and register functions with different sets of credentials", function(){
  let agent = request.agent(server);
  it("should log the user in", function(done){
    chai.request(server).post("/loginForm").send({'username':'admin', 'password':'root'})
      .end(function(err,res){
        res.text.should.not.include('incorrect');
        res.should.be.html;
        res.should.have.status(200);
        done();
      })
  })

  it("should not log the user in", function(done){
    chai.request(server).post("/loginForm").send({'username':'admin', 'password':'notthecorrectpassword'})
      .end(function(err,res){
        res.text.should.include('incorrect');
        res.should.be.html;
        res.should.have.status(200);
        done();
      })
  })

  it("should allow creation of account", function(done){
    chai.request(server).post("/registerForm").send({'username':'testAcc'+ Math.floor(Math.random()*10000), 'password':'testAcc'})
      .end(function(err,res){
        res.text.should.not.include('please choose another');
        res.should.be.html;
        res.should.have.status(200);
        done();
      })
  })

  it("should not allow creation of account due to duplicate username", function(done){
    chai.request(server).post("/registerForm").send({'username':'admin', 'password':'duplicateusername'})
      .end(function(err,res){
        res.text.should.include('username is already taken');
        res.should.be.html;
        res.should.have.status(200);
        done();
      })
  })

  it("should not allow creation of account due to duplicate email", function(done){
    chai.request(server).post("/registerForm").send({'username':'nottakenusername', 'password':'notthecorrectpassword', 'email': 'splatwebservices@gmail.com'})
      .end(function(err,res){
        res.text.should.include('email is already taken');
        res.should.be.html;
        res.should.have.status(200);
        done();
      })
  })

  it("should not allow access to site because no session username", function(done){
    chai.request(server).get("/userView")
      .end(function(err,res){
        res.text.should.include('Enter your username');
        res.should.be.html;
        res.should.have.status(200);
        done();
      })
  })

  it("testing rooms", function(done){
    chai.request(server).post("/loginForm").send({'username':'admin', 'password':'notthecorrectpassword'})
      .end(function(err,res){
        chai.request(server).get('/create_room')

        res.should.have.status(200);
        // res.text.should.include('admin')
        done();
      })
  })
})

describe("Various tests on the creating and accessing of forums", function(){
  let agent = request.agent(server);
  var random = Math.floor(Math.random()*10000);
  it("Should create a forum with a unique name", function(done){
    agent.post("/loginForm").send({'username':'admin', 'password':'root', 'forumName':'thisisATest' + random, 'forumPassword': 'testingPass'})
      .end(function(err,res){
        agent.post("/create_forum").send({'username':'admin', 'password':'root', 'forumName':'thisisATest' + random, 'forumPassword': 'testingPass'})
          .end(function(err2,res2){
            res2.should.have.status(302);
            res2.text.should.include('Redirecting to /catalog');
            done();
          })
      })
  })

  it("Should not create a forum because name is not unique", function(done){
    agent.post("/loginForm").send({'username':'admin', 'password':'root', 'forumName':'main', 'forumPassword': 'testingPass'})
      .end(function(err,res){
        agent.post("/create_forum").send({'username':'admin', 'password':'root', 'forumName':'main', 'forumPassword': 'testingPass'})
          .end(function(err2,res2){
            res2.should.have.status(200);
            res2.should.be.html;
            res2.text.should.not.include('Redirecting to /catalog');
            done();
          })
      })
  })

  it("Should not acces a forum because password is wrong", function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test', 'forumName':'thisisATest' + random, 'forumPassword': 'testingPass22'})
      .end(function(err,res){
        agent.post("/access_forum").send({'username':'test', 'password':'test', 'forumName':'thisisATest' + random, 'forumPassword': 'testingPass22'})
          .end(function(err2,res2){
            res2.should.have.status(200);
            res2.should.be.html;
            res2.text.should.not.include('Redirecting to /catalog');
            done();
          })
      })
  })

  it("Should allow access to a forum", function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test', 'forumName':'thisisATest' + random, 'forumPassword': 'testingPass'})
      .end(function(err,res){
        agent.post("/access_forum").send({'username':'test', 'password':'test', 'forumName':'thisisATest' + random, 'forumPassword': 'testingPass'})
          .end(function(err2,res2){
            res2.should.have.status(302);
            res2.text.should.include('Redirecting to /catalog');
            done();
          })
      })
  })

  it("Should not access a forum because user already has access to forum", function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test', 'forumName': 'main', 'forumPassword': 'testingPass'})
      .end(function(err,res){
        agent.post("/access_forum").send({'username':'test', 'password':'test', 'forumName': 'main', 'forumPassword': 'testingPass'})
          .end(function(err2,res2){
            res2.should.have.status(200);
            res2.should.be.html;
            res2.text.should.not.include('Redirecting to /catalog');
            done();
          })
      })
  })
})

describe('ban system', (done)=>{
	let agent = request.agent(server);
   // load bans
  	it('load ban table for /admin/bans', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/admin/bans/").send({})
   			.end((err2, res2)=>{
   				res2.should.have.status(200);
   				done();
   			})
   	})
   })

	// adding a ban
	it('load ban table for /banUser', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/banUser").send({
   			'username':'internal_test',
   			'days': -1,
   			'rules':'test',
   			'id': -1,
   			'post_id': -1
   		})
   			.end((err2, res2)=>{
   				res2.should.have.status(302);
   				done();
   			})
   	})
   })

	// removing a ban
	it('removing single bans for /admin/deleteBan', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/admin/deleteBan").send({
   			'id':-1
   		})
   			.end((err2, res2)=>{
   				res2.should.have.status(302);
   				done();
   			})
   	})
   })

   // removing all expired bans
   it('remove all bans /deleteBanExpired', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/deleteBanExpired").send({
   		})
   			.end((err2, res2)=>{
   				res2.should.have.status(302);
   				done();
   			})
   	})
   })
	
});





