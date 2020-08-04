// NOTE: this example uses the chess.js library:
// https://github.com/jhlywa/chess.js
console.log( "color" );
var first = document.getElementById( "chess-script" ).getAttribute( "data-first" );
var room = document.getElementById( "chess-script" ).getAttribute( "data-room" );

var board = null;
var socket = io.connect( window.location.hostname);
// var socket = io.connect( "http://localhost:1300" );
var color;
var ublack;
var uwhite;

// socket.on("col", function (data) {
//     color=data;
//     console.log(color);
// });
// console.log( room );
console.log( first );
if( first=="true" ){
	console.log( "room joining first",room );
	socket.emit( "create_join_room",room );
}
else{
	console.log( "room joining second" );
	socket.emit( "join_room",room );
}

// document.getElementById( "join" ).addEventListener( "click", function(){
// 	socket.emit( "join_room", null );
// } );
// document.getElementById( "reset" ).addEventListener( "click", function(){
// 	socket.emit( "reset", null );
// } );

// document.getElementById("start").addEventListener("click", function(){
//   socket.emit('start', null);
// });
socket.on( "opponent_disconnect", function(){
	document.getElementById( "disconnect" ).textContent="Opponent Disconnected and forfeits the match";
	setTimeout( function(){
		window.location.href = "/rooms";
	}, 3000 );

} );

function onDragStart ( source, piece, position, orientation ) {
	// socket.emit('drag_start',piece);
  

  
	// do not pick up pieces if the game is over
	//   socket.on('game_over',data=>{
	//     if (data) return false
	//   })

	//   // only pick up pieces for the side to movxse
	//     socket.on('side',data=>{
	//       console.log(data)

//         if (data) {
//             console.log('lol')
//         return false }
//     })
}

function onDrop ( source, target ) {
	// see if the move is legal
//   var move = game.move({
//     from: source,
//     to: target,
//     promotion: 'q' // NOTE: always promote to a queen for example simplicity
//   })
	socket.emit( "move",[ room,{
		"from": source,
		"to": target,
		"promotion": "q" 
	} ] );
	updateStatus();
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
socket.on( "fen",data=>{
	board.position( data );
} );
// socket.on('user_name',data=>{
//   console.log('working')
//   if(data[1]=='white'){
//     var wname=document.getElementById('u2')
//     wname.textContent=data[0];
//   }
//   else if(data[1]=='black'){
//     var bname=document.getElementById('u1')
//     bname.textContent=data[0];
//   }
// })
socket.on( "user_name",data=>{
	console.log( "working" );

	var wname=document.getElementById( "u2" );
	wname.textContent=data[0];
	uwhite=data[0];
	ublack=data[1];
	var bname=document.getElementById( "u1" );
	bname.textContent=data[1];

} );
socket.on( "user_data",data=>{
	console.log( "working user data" );
	if( uwhite==data[0].username ){
		console.log( "working user data1" );

		document.getElementById( "rating2" ).textContent=	document.getElementById( "rating2" ).textContent+data[0].chess_elo;
		document.getElementById( "rating1" ).textContent=	document.getElementById( "rating1" ).textContent+data[1].chess_elo;
	}
	else{
		console.log( "working user dat2a" );

		document.getElementById( "rating1" ).textContent=	document.getElementById( "rating1" ).textContent+data[0].chess_elo;
		document.getElementById( "rating2" ).textContent=	document.getElementById( "rating2" ).textContent+data[1].chess_elo;
	}
} );


console.log( color );

var config = {
//   orientation:color,
	draggable: true,
	position: "start",
	onDragStart: onDragStart,
	onDrop: onDrop,
	onSnapEnd: onSnapEnd
};
board = Chessboard( "myBoard", config );

