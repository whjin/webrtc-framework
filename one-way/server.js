const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.get("/", (req, res) => {
  res.end();
});

let clients = [];

io.on("connection", (socket) => {
  const { query } = socket.handshake;
  let { code, name, ip, id } = query;

  socket.join(code);

  clients.push({ userId: socket.id, code });

  if (clients.length) {
    let hash = {};
    clients = clients.reduce((item, next) => {
      hash[next.code] ? false : (hash[next.code] = true && item.push(next));
      return item;
    }, []);
  }

  if (clients.length > 1) {
    io.in(code).emit("ready", code);
  }
  clients = [...new Set(clients)];

  socket.on("start_intercom", (deviceList, muted) => {
    io.to(deviceList[1]).emit("start_intercom", muted);
  });

  socket.on("control_offer", (data) => {
    io.to(data.code).emit("control_offer", data.offer);
  });

  socket.on("control_answer", (data) => {
    io.to(data.code).emit("control_answer", data.answer);
  });

  socket.on("onicecandidate", (data) => {
    if (data.candidate) {
      io.to(data.code).emit("onicecandidate", data.candidate);
    }
  });

  socket.on("hangup", (code) => {
    io.to(code).emit("hangup");
  });
});

http.listen(3000, () => {
  console.log("Server is running on port 3000");
});
