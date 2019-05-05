const {} = require('./config/config');
const io = require('socket.io')();

io.on('connection', socket => {
    console.log("user connected");

    socket.on('message', msg => {
        console.log('message: ' + msg);
    });

    socket.on('disconnect', () => {
        // io.emit('user disconnected');
        console.log('user disconnected');
    });
});

module.exports = io;