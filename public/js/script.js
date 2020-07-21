// NOTE: this example uses the chess.js library:
// https://github.com/jhlywa/chess.js
console.log('color');

var board = null
// var socket = io.connect(window.location.hostname);
var socket = io.connect('http://localhost:1000');

var color;
// socket.on("col", function (data) {
//     color=data;
//     console.log(color);
// });


function onDragStart (source, piece, position, orientation) {
  socket.emit('drag_start',piece);
  console.log('lo1l')

  
  // do not pick up pieces if the game is over
  socket.on('game_over',data=>{
    if (data) return false
  })

  // only pick up pieces for the side to movxse
    socket.on('side',data=>{
        console.log('lo1l')
        if (data) {
            console.log('lol')
        return false }
    })
}

function onDrop (source, target) {
  // see if the move is legal
//   var move = game.move({
//     from: source,
//     to: target,
//     promotion: 'q' // NOTE: always promote to a queen for example simplicity
//   })
  socket.emit('move',{
    "from": source,
    "to": target,
    "promotion": 'q' 
})
  updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {

    

}
function updateStatus () {


//   $status.html(status)
//   $fen.html(game.fen())
//   $pgn.html(game.pgn())
}
socket.on('fen',data=>{
    board.position(data);
})

console.log(color);

var config = {
//   orientation:color,
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

