var chai = require('chai');
var chaihttp = require('chai-http');
var server = require('../index');
var should = chai.should();

chai.use(chaihttp);

<<<<<<< HEAD
describe('rooms', function(){
    it('should display all rooms for /rooms', function(done){
        chai.request(server).post('/create_room').send({"room":2})
            .end(function(error, res){
            res.should.have.status(200);
            // res.should.be.json;
            res.body[0].room.should.equal(2)
            done();
        })
    })
})
=======
describe("Testing login and register functions with different sets of credentials", function(){
  it("should log the user in", function(done){
    chai.request(server).post("/loginForm").send({'username':'admin', 'password':'root'})
      .end(function(err,res){
        res.text.should.not.include('incorrect');
        done();
      })
  })

  it("should not log the user in", function(done){
    chai.request(server).post("/loginForm").send({'username':'admin', 'password':'notthecorrectpassword'})
      .end(function(err,res){
        res.text.should.include('incorrect');
        done();
      })
  })

  it("should allow creation of account", function(done){
    chai.request(server).post("/registerForm").send({'username':'testAcc'+ Math.floor(Math.random()), 'password':'testAcc'})
      .end(function(err,res){
        res.text.should.not.include('please choose another');
        done();
      })
  })

  it("should not allow creation of account due to duplicate username", function(done){
    chai.request(server).post("/registerForm").send({'username':'admin', 'password':'duplicateusername'})
      .end(function(err,res){
        res.text.should.include('username is already taken');
        done();
      })
  })

  it("should not allow creation of account due to duplicate email", function(done){
    chai.request(server).post("/registerForm").send({'username':'nottakenusername' + Math.floor(Math.random(), 'password':'notthecorrectpassword', 'email': 'splatwebservices@gmail.com'})
      .end(function(err,res){
        res.text.should.include('email is already taken');
        done();
      })
  })
})
>>>>>>> 06bd285f800473f5a01742a6eb00f1e870eb2224
