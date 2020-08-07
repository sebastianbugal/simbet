var chai = require('chai');
var chaihttp = require('chai-http');
var server = require('../index');
var should = chai.should();
var request = require('supertest')
chai.use(chaihttp);

describe("Testing login and register functions with different sets of credentials", function(){
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
    chai.request(server).post("/registerForm").send({'username':'testAcc'+ Math.floor(Math.random()*1000), 'password':'testAcc'})
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

})
describe('Testing chess', function(){
  let agent = request.agent(server);

  it("testing room creation", function(done){
   agent.post("/loginForm").send({'username':'1', 'password':'1'})
      .end(function(err,res){
        agent.get('/create_room')    
        res.should.have.status(302);
        done();
      })
  })
  it('testing joining room', function(done){
    agent.post("/loginForm").send({'username':'2', 'password':'2'})
    .end(function(err,res){
      agent.get('/join_roonm')
      res.should.have.status(302);
      
      done();
    })
  })
})