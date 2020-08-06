var chai = require('chai');
var chaihttp = require('chai-http');
var server = require('../index');
var should = chai.should();

chai.use(chaihttp);

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