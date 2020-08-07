var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../index');
var should = chai.should();
var request = require('supertest');

chai.use(chaiHttp);


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
  it("should access Userview when user logins", function(done){
    chai.request(server).post("/loginForm").send({'username':'a', 'password':'1'})
    .end(function(err,res){
    chai.request(server).get("/userView")
      .end(function(err,res){
        res.should.have.status(200);
        done();
      })
      })
  });

  it("should access Gamesmenus when user login", function(done){
    chai.request(server).post("/loginForm").send({'username':'admin', 'password':'notthecorrectpassword'})
    .end(function(err,res){
    chai.request(server).get("/games")
      .end(function(err,res){
        res.should.have.status(200);
        done();
      })
      })
  });

  it("should not allow access to site because no session username", function(done){
    chai.request(server).get("/userView")
      .end(function(err,res){
        res.text.should.include('Enter your username');
        res.should.be.html;
        res.should.have.status(200);
        done();
      })
  })

})
describe('Testing chess', function(){
  let agent = request.agent(server);

  it("testing room creation", function(done){
   agent.post("/loginForm").send({'username':'test', 'password':'test'})
      .end(function(err,res){
        agent.get('/create_room')
        res.should.have.status(302);
        done();
      })
  })
  it('testing joining room', function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test'})
    .end(function(err,res){
      agent.get('/join_roonm')
      res.should.have.status(302);

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

  it("Should make a new thread and redirect to the new thread", function(done){
    agent.post("/loginForm").send({'username':'admin', 'password':'root'})
      .end(function(err,res){
        agent.post("/add-thread").send({"tSubject":'1', "tForum":'main', "pUsername":'admin', "pText":"1"})
          .end(function(err2,res2){
            res2.should.have.status(200);
            res2.should.be.html;
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
   				res2.should.have.status(302);
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

describe('report system', (done)=>{
	let agent = request.agent(server);
   // load reports in admin view
  	it('load report table for /admin', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/admin").send({})
   			.end((err2, res2)=>{
   				res2.should.have.status(200);
   				done();
   			})
   	})
   })

	// adding a report
	it('send-report to database', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/send-report").send({
   			"rPostId": 0,
   			"rRule": "testrule",
   			"id": 0,
   			"username": "testuser"
   		})
   		.end((err2, res2)=>{
   			res2.should.have.status(200);
   			done();
   		})
   	})
   })

	// removing a report
	it('removing a report from the database', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/deleteReport").send({
   			'id':-1
   		})
   			.end((err2, res2)=>{
   				res2.should.have.status(302);
   				done();
   			})
   	})
   })
});

describe('misc admin functions', (done)=>{
	let agent = request.agent(server);
	// delete post
	it('removing a report from the database', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/deleteReport").send({
   			'pid':-1
   		})
   			.end((err2, res2)=>{
   				res2.should.have.status(200);
   				done();
   			})
   	})
   })
	// nuke user
	it('Nuke user delete user posts', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/deleteUser").send({
   			'username': 'testoak'
   		})
   			.end((err2, res2)=>{
   				res2.should.have.status(302);
   				done();
   			})
   	})
   })

});

describe('make a non-thread post', (done)=>{
	let agent = request.agent(server);
	// make post
	it('making a non-thread post that may include replies', (done)=>{
   	agent.post('/loginForm').send({'username':'test', 'password':'test'})
   	.end((err, res)=>{
   		agent.post("/add-post").send({
   			'pThreadId':-1,
   			'pText': "testpTextforThread"
   		})
   			.end((err2, res2)=>{
   				res2.should.have.status(200);
   				done();
   			})
   	})
   })
});


describe("Testing following and blocking", function(){
  let agent = request.agent(server);
  it("Should follow the user admin", function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test', 'searchVal': 'admin'})
      .end(function(err,res){
        agent.post("/add_user").send({'username':'test', 'password':'test', 'searchVal': 'admin'})
          .end(function(err2,res2){
            agent.get("/user_add").send({'username':'test', 'password':'test', 'searchVal': 'admin'})
              .end(function(err3,res3){
                res3.should.be.html;
                res3.text.should.include('admin');
                done();
              })
          })
      })
  })
  it("Should unfollow the user admin", function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test', 'unfollow': 'admin'})
      .end(function(err,res){
        agent.post("/unfollow").send({'username':'test', 'password':'test', 'unfollow': 'admin'})
          .end(function(err2,res2){
            agent.get("/user_add").send({'username':'test', 'password':'test', 'unfollow': 'admin'})
              .end(function(err3,res3){
                res3.should.be.html;
                res3.text.should.not.include('admin');
                done();
              })
          })
      })
  })
  it("Should block the user admin", function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test', 'searchVal': 'admin'})
      .end(function(err,res){
        agent.post("/block_user").send({'username':'test', 'password':'test', 'searchVal': 'admin'})
          .end(function(err2,res2){
            agent.get("/user_add").send({'username':'test', 'password':'test', 'searchVal': 'admin'})
              .end(function(err3,res3){
                res3.should.be.html;
                res3.text.should.include('admin');
                done();
              })
          })
      })
  })
  it("Should unblock the user admin", function(done){
    agent.post("/loginForm").send({'username':'test', 'password':'test', 'unblock': 'admin'})
      .end(function(err,res){
        agent.post("/unblock").send({'username':'test', 'password':'test', 'unblock': 'admin'})
          .end(function(err2,res2){
            agent.get("/user_add").send({'username':'test', 'password':'test', 'unblock': 'admin'})
              .end(function(err3,res3){
                res3.should.be.html;
                res3.text.should.not.include('admin');
                done();
              })
          })
      })
  })
})

// Leaderboard Tests
describe('Leaderboard Tests', function() {
    let agent = request.agent(server);

    it('should load leaderboard and placeholders for twitter feed', function(done) {
        agent.post("/loginForm").send({'username':'admin', 'password':'root'})
            .end(function(err, res1) {
                agent.get('/leaderBoards')
                .end(function(err, res2) {
                    res2.should.have.status(200);
                    res2.should.be.html;
                    res2.text.should.include('<div class="tweet_hash">');
                    res2.text.should.include('<div class="embedded_feed">');
                    done();
                });
            });

    });

    it('should organize players by elo with highest elo at the top', function(done) {
        agent.post("/loginForm").send({'username':'admin', 'password':'root'})
            .end(function(err, res1) {
                agent.get('/leaderBoards')
                .end(function(err, res2) {
                    res2.should.have.status(200);
                    res2.should.be.html;
                    chai.assert(res2.text.split('</script>')[5].split('<tr>')[2].split('<td>')[6].split('</td>')[0]
                            >= res2.text.split('</script>')[5].split('<tr>')[3].split('<td>')[6].split('</td>')[0]); // don't judge
                    res2.text.should.include('<div class="tweet_hash">');
                    res2.text.should.include('<div class="embedded_feed">');
                    done();
                });
            });
    });

    it('should send a GET request to Twitter API', function(done) {
        agent.post("/loginForm").send({'username':'admin', 'password':'root'})
        .end(function(err, res1) {
            agent.get('/leaderBoards')
            .end(function(err, res2) {
                res2.should.have.status(200);
                res2.should.be.html;
                res2.text.should.include('<blockquote class="twitter-tweet">');
                done();
            });
        });
    });
});

// Twitter API call Tests
describe('Twitter API Call Tests', function() {
    let agent = request.agent(server);

    it('should receive a redirect to authorization site', function(done) {
        agent.post("/loginForm").send({'username':'admin', 'password':'root'})
        .end(function(err, res1) {
            agent.get('/tweetAuth')
            .end(function(err, res2) {
                res2.should.have.status(302);
                res2.header.location.should.include("?oauth_token");
                done();
            });
        });
    });

    it('should redirect back to leaderboards since no user tokens are available in testing', function(done) {
        agent.post("/loginForm").send({'username':'admin', 'password':'root'})
        .end(function(err, res1) {
            agent.get('/tweetAuthed?denied')
            .end(function(err, res2) {
                res2.should.have.status(302);
                done();
            });
        });
    });

});

