const express = require('express');
const app = express();
const port = 3000;
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');
app.use(express.static(path.join(__dirname, "/public")));

io.on("connection", (socket) => {
    socket.on("sender-join", function (data) {
        socket.join(data.uid);
    });

    socket.on("receiver-join", function (data) {
        socket.join(data.uid);
        console.log("Receiver joined room: " + data.uid);
        socket.in(data.sender_uid).emit("init", data.uid);
    });

    socket.on("fs-start-request", function (data) {
        console.log("File transfer request received for room: " + data.uid);
        socket.in(data.uid).emit("fs-start-request", data.metadata);
    });

    socket.on("fs-start-response", function (data) {
        console.log("File transfer response received from receiver for room: " + data.uid);
        socket.in(data.uid).emit("fs-start-response", data.accepted);
    });

    socket.on("fs-share", function (data) {
        socket.in(data.uid).emit("fs-share", data.buffer);
    });

    socket.on("file-raw", function (data) {
        socket.in(data.uid).emit("fs-share", data.buffer);
    });
    
    console.log("Client connected");
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});