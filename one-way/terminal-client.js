import config from "@/common/config";

const io = require("socket.io-client");

let terminalInfo = uni.getStorageSync("terminalInfo");
let { controlCode, code } = terminalInfo;
let deviceList = [controlCode, code];
let localVideo;
let localStream;
let peer;
let isMuted = false;

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

const socket = io.connect(config.socketUrl, { query: terminalInfo });

createConnection();

function createConnection() {
  peer = new RTCPeerConnection(iceServerConfig);

  peer.ontrack = (e) => {
    if (localVideo) {
      console.log(isMuted);
      localVideo.muted = isMuted;
      localVideo.srcObject = e.streams[0];
    }
  };

  peer.onicecandidate = (e) => {
    socket.emit("onicecandidate", {
      code: deviceList[0],
      candidate: e.candidate,
    });
  };
}

socket.on("connect", () => {
  socket.on("ready", (name) => {
    console.log(name + "已上线");
  });

  socket.on("start_intercom", (muted) => {
    isMuted = muted;
    startIntercom(localVideo);
  });

  socket.on("control_offer", (offer) => {
    peer.setRemoteDescription(offer);
    anserRemoteVideo(deviceList[0]);
  });

  socket.on("onicecandidate", (candidate) => {
    peer.addIceCandidate(candidate);
  });

  socket.on("hangup", () => {
    hangupVideo();
  });
});

function getLocalVideo(selector) {
  return new Promise(async (resolve, reject) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      selector.srcObject = stream;
      resolve(selector);
    } catch (err) {
      console.log("Failed to get the stream", err);
      reject(err);
    }
  });
}

function startIntercom(selector) {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      localVideo = selector;
      localStream = stream;
      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });
      peer.addStream(localStream);
    })
    .catch((err) => {
      console.error("Failed to get the stream", err);
    });
}

function anserRemoteVideo(code) {
  peer
    .createAnswer({
      offerToReceiveVideo: 1,
      offerToReceiveAudio: 1,
    })
    .then((answer) => {
      peer.setLocalDescription(answer);
      socket.emit("control_answer", { code, answer });
    })
    .catch((err) => {
      console.error("Failed to create answer", err);
    });
}

function hangupVideo() {
  const tracks = localVideo.srcObject.getTracks();
  tracks.forEach((track) => {
    track.stop();
  });
}

export default { getLocalVideo, startIntercom, hangupVideo };
