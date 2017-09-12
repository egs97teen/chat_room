var express = require("express"),
session = require("express-session"),
app = express();

app.use(express.static(__dirname + '/static'));
app.use(session({ secret: "abc" }));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var server = app.listen(8000, function() {
 console.log("listening on port 8000");
});

var io = require('socket.io').listen(server);

app.get('/', function(req, res) {
	res.render('index', {title: "Survey Form"});
})

var users = [];
class User {										// create a user when new user signs in
	constructor(name) {
		this.name = name;							// user has a name attribute
		this.id;									// user will have a unique ID which is the socket.id that is created when a user connects
	}
}
var messages = [];

io.sockets.on('connection', function(socket) {
	socket.on("new_user", function(data) {
		if (users.length == 0){						// check if this is the first user 
			var user = new User(data.name);			// construct user
			user.id = socket.id;					// assign user id to socket.id
			users.push(user);						// add user to the array of users currently signed in
			var message = { name: user.name, type: 'status', message: `<p id="join">${user.name} has joined the room!</p>`}		// create a login message to be stored in message history with a type of "status" so that later on the client-side knows how to format the message
			messages.push(message);					// add the login message to the array of message history
			io.emit("add_new_user", user);			// full broadcast that a user has joined
		} else {
			var taken = false;						// if this is not the first user signing in, run a check to see if the username is already taken
			for (var i = 0; i < users.length; i++){	// loop through all current users
				if (data.name == users[i].name) {	// check if the new name being entered matches a current users' name
					socket.emit("user_taken")		
					taken = true;
				} 
			}
			if (taken != true) {					// if the check is passed, create the user
				var user = new User(data.name);
				user.id = socket.id;
				users.push(user);							// add user to list of current users
				var message = { name: user.name, type: 'status', message: `<p id="join">${user.name} has joined the room!</p>`}
				messages.push(message);
				io.emit("add_new_user", user);				// broadcast new user to current users
				}
			}
		})

	socket.emit("current_users", users);				// upon connection, send the client an array of current users logged in to be printed
	socket.emit("current_messages", messages);			// and an array of message history

	socket.on("new_message", function(data) {
		if (data.message.length === 0) {				// check if the client is submitting a blank message
			return false;
		} else {
			var message = { name: data.name, message: data.message, type: 'message' }	// store message in an object to be added to the array of messages, message type is "message" so client side knows how to format the message
			messages.push(message);
			io.emit("add_new_message", message);
		}
	})

	socket.on("disconnect", function() {
		var disconnected_user;
		for (var i=0; i < users.length; i++) {
			if (users[i].id = socket.id) {						// when a user disconnects, the only identifying information left about that user is their socket.id, which was stored in user.id, so find that user with an id that matches the socket.id and splice them from the array of current users
				disconnected_user = { name: users[i].name }
				users.splice(i, 1);
				var message = { name: users[i].name, type: 'status', message: `<p id="leave">${users[i].name} has left the room!</p>`}	// create a disconnect status message to add to the user history
				messages.push(message);
			}
		}
		io.emit("user_left", { users: users, disconnected_user: disconnected_user} )
	})
})