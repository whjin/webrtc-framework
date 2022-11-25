import config from "@/common/config";
const io = require("socket.io-client");

const controlInfo = uni.getStorageSync("controlInfo");
let deviceList = [];
let localVideo;
let localStream;
let peer;

const iceServerConfig = {
  iceServers: [
    {
      url: "stun:stun.l.google.com:19302",
    },
    {
      url: "turn:192.168.1.216:3478",
      username: "admin",
      credential: "123456",
    },
  ],
};

const socket = io.connect(config.socketUrl, { query: controlInfo });

createConnection();

function createConnection() {
  peer = new RTCPeerConnection(iceServerConfig);

  peer.ontrack = (e) => {
    localVideo.srcObject = e.streams[0];
  };

  peer.onicecandidate = (e) => {
    socket.emit("onicecandidate", {
      code: deviceList[1],
      candidate: e.candidate,
    });
  };
}

socket.on("connect", () => {
  socket.on("ready", (name) => {
    console.log(name + "已上线");
  });

  socket.on("control_answer", (answer) => {
    peer.setRemoteDescription(answer);
  });

  socket.on("onicecandidate", (candidate) => {
    peer.addIceCandidate(candidate);
  });
});

function startCamera() {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        resolve(stream);
      })
      .catch((err) => {
        console.log("Failed to get the stream", err);
        reject(err);
      });
  });
}

function startIntercom(selector, code, muted) {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      localVideo = selector;
      localStream = stream;
      deviceList = [controlInfo.code, code];
      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });
      peer.addStream(localStream);
      socket.emit("start_intercom", deviceList, muted);
      callRemoteVideo(code);
    })
    .catch((err) => {
      console.error("Failed to get the stream", err);
    });
}

function callRemoteVideo(code) {
  peer
    .createOffer({
      offerToReceiveVideo: 1,
      offerToReceiveAudio: 1,
    })
    .then((offer) => {
      peer.setLocalDescription(offer);
      socket.emit(`control_offer`, { code, offer });
    })
    .catch((err) => {
      console.error("Failed to create the offer", err);
    });
}

function hangupVideo() {
  const tracks = localVideo.srcObject.getTracks();
  tracks.forEach((track) => {
    track.stop();
  });
  socket.emit("hangup", deviceList[1]);
}

export default { startCamera, startIntercom, hangupVideo };
