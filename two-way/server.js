const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { document } = new JSDOM("<!doctype html><html><body></body></html>")
  .window;
global.document = document;
const window = document.defaultView;
const $ = require("jquery")(window);

app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use("/assets", express.static("assets"));

app.get("/lawyerLogin/:roomId", (req, res) => {
  res.sendFile(__dirname + "/lawyerLogin.html");
});
app.get("/prisonerLogin/:roomId", (req, res) => {
  res.sendFile(__dirname + "/prisonerLogin.html");
});

app.get("/lawyer/:roomId", (req, res) => {
  res.sendFile(__dirname + "/lawyer.html");
});

app.get("/prisoner/:roomId", (req, res) => {
  res.sendFile(__dirname + "/prisoner.html");
});
app.get("/header", (req, res) => {
  res.sendFile(__dirname + "/header.html");
});
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

let message = {};

io.on("connection", (socket) => {
  socket.on("create_or_join", ({ role, room }) => {
    message = { role, room };
    socket.join(room);
    socket.to(room).emit("join_room", room);
  });

  socket.on("offer", (offer, room) => {
    socket.join(room);
    socket.to(room).emit("offer", offer);
  });

  socket.on("answer", (answer, room) => {
    socket.join(room);
    socket.to(room).emit("answer", answer);
  });

  socket.on("icecandidate", (candidate, room) => {
    socket.join(room);
    socket.to(room).emit("icecandidate", candidate);
  });

  // 管理后台登入，用于插话、获取律师端截屏
  socket.on("manageJoin", (room) => {
    socket.join(room);
  });

  // 通知律师端开启截屏
  socket.on("screencastOffer", (message) => {
    message.socketId = socket.id;
    socket.to(message.roomId).emit("screencastOffer", message);
  });

  socket.on("screencastAnswer", (message) => {
    let client = io.sockets.connected[message.socketId];
    if (client) {
      client.emit("screencastAnswer", message);
    }
  });

  socket.on("candidateToManage", (message) => {
    let client = io.sockets.connected[message.socketId];
    if (client) {
      client.emit("candidateToManage", message);
    }
  });

  socket.on("candidateToLawyer", (message) => {
    message.socketId = socket.id;
    socket.to(message.roomId).emit("candidateToLawyer", message);
  });

  // 转发笔记至在押人员屏幕
  socket.on("sendNote", (res) => {
    socket.to(JSON.parse(res).roomId).emit("receiveNote", res);
  });

  // 转发图片至在押人员屏幕
  socket.on("sendPhoto", (res) => {
    socket.to(JSON.parse(res).roomId).emit("receivePhoto", res);
  });

  // 转发挂断
  socket.on("sendQuit", (res) => {
    socket.to(JSON.parse(res).roomId).emit("receiveQuit", res);
  });

  // 转发滚动
  socket.on("sendScroll", (res) => {
    socket.to(JSON.parse(res).roomId).emit("receiveScroll", res);
  });

  // 切回视频
  socket.on("sendVideo", (res) => {
    socket.to(JSON.parse(res).roomId).emit("receiveVideo", res);
  });

  socket.on("sendHangUp", (message) => {
    socket.to(message).emit("hangUp");
  });
  socket.on("sendStartScreen", (url, code) => {
    socket.to(url).emit("startScreen", code);
  });
  socket.on("sendEndScreen", (url, code) => {
    socket.to(url).emit("endScreen", code);
  });
  // 管理后台插话
  socket.on("sendMessage", (res) => {
    const msgInfo = JSON.parse(res);
    if (msgInfo.messageInfo.roleType) {
      socket.to(msgInfo.roomId).emit("sendToLawyer", res);
    } else {
      socket.to(msgInfo.manageId).emit("sendToManage", res);
    }
  });
});

http.listen(3000, () => {
  console.log("start server success, listening on port: 3000");
});
