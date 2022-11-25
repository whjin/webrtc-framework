const pathName = window.location.pathname;
const room = pathName.split("/")[2];

const localVideo = document.getElementsByClassName("bigVideo")[1];
const remoteVideo = document.getElementsByClassName("bigVideo")[0];
localVideo.onloadeddata = () => {
  localVideo.play();
};
remoteVideo.onloadeddata = () => {
  remoteVideo.play();
};

let offerState = false;

let repeatJoin = false;
let repeatOffer = false;
let repeatAnswer = false;

let peer = null;
let localStream = null;
const PeerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;
!PeerConnection && message.error("浏览器不支持WebRTC！");

const iceServersConfig = {
  iceServers: [
    {
      urls: ["stun:68.232.28.46:3488", "stun:192.168.1.56:3488"],
    },
    {
      urls: ["turn:68.232.28.46:3478", "turn:192.168.1.56:3478"],
      username: "admin",
      credential: "gktel12345",
    },
  ],
};

let message = {
  roomId: room,
  name: "",
  idCard: "",
  role: "control",
};

const socket = io(socketUrl);

socket.onerror = () => message.error("信令通道创建失败！");

createRtcConnect();

function createRtcConnect() {
  peer = new PeerConnection(iceServersConfig);

  peer.ontrack = (e) => {
    if (e && e.streams) {
      remoteVideo.srcObject = e.streams[0];
      localStream = e.streams[0];
    }
  };

  peer.onicecandidate = (e) => {
    if (e && e.candidate) {
      socket.emit("icecandidate", e.candidate, room);
      startFaceTimer();
    }
  };

  peer.oniceconnectionstatechange = (e) => {
    let state = peer.iceConnectionState;
    console.log(state, offerState);
    if (state == "disconnected") {
      notice("当前网络已断开，请稍候...", "error");
      if (localVideo.srcObject) {
        localVideo.srcObject.getTracks().forEach((track) => track.stop());
      }
      if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
      }
    }
  };
}

function createOffer() {
  createRtcConnect();
  startLive().then(() => {
    peer
      .createOffer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      })
      .then((offer) => {
        offerState = true;
        if (offer) {
          peer.setLocalDescription(offer);
          socket.emit("offer", offer, message.roomId);
        }
      });
  });
}

function createAnswer(offer) {
  createRtcConnect();
  startLive().then(() => {
    peer.setRemoteDescription(offer);
    peer
      .createAnswer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      })
      .then((answer) => {
        if (answer) {
          peer.setLocalDescription(answer);
          socket.emit("answer", answer, message.roomId);
        }
      });
  });
}

socket.on("connect", () => {
  startLive();

  if (!offerState) {
    socket.emit("create_or_join", {
      role: message.role,
      room: message.roomId,
    });
  } else {
    createOffer();
  }

  socket.on("join_room", (room) => {
    console.log("join_room", offerState);
    message.roomId = room;
    if (!repeatJoin) {
      repeatJoin = true;
      createOffer();
      setTimeout(() => {
        repeatJoin = false;
      }, 1500);
    }
  });

  socket.on("offer", (offer) => {
    console.log("offer", offerState);
    if (!repeatOffer) {
      repeatOffer = true;
      if (offer) {
        createAnswer(offer);
      }
      setTimeout(() => {
        repeatOffer = false;
      }, 1500);
    }
  });

  socket.on("answer", (answer) => {
    console.log("answer", offerState);
    if (!repeatAnswer) {
      repeatAnswer = true;
      if (answer) {
        peer.setRemoteDescription(answer);
      }
      setTimeout(() => {
        repeatAnswer = false;
      }, 1500);
    }
  });

  socket.on("icecandidate", (candidate) => {
    if (offerState && candidate) {
      peer.addIceCandidate(candidate);
    }
  });

  socket.on("sendToLawyer", (res) => {
    const msgInfo = JSON.parse(res);
    if (msgInfo.roomId == message.roomId) {
      chatDialog.showChatDialog();
      chatDialog.addAdverseMessage(msgInfo.messageInfo);
    }
  });

  socket.on("hangUp", function () {
    handUp();
  });
});
