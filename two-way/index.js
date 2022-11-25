// dev
let socketUrl = "http://localhost:3000"; // 本地

// 打开媒体流
function startLive() {
  return new Promise(async (resolve, reject) => {
    let stream;
    let videoId = "";
    try {
      await navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        for (let i = 0; i !== deviceInfos.length; ++i) {
          const deviceInfo = deviceInfos[i];
          if (deviceInfo.kind === "videoinput") {
            // 外置摄像头为HD Pro , 一体机摄像头为HP 2.0MP
            if (
              deviceInfo.label.indexOf("Document Scanner") === -1 &&
              deviceInfo.label.indexOf("USB Camera") === -1 &&
              deviceInfo.label.indexOf("screen-capture-recorder") === -1
            ) {
              videoId = deviceInfo.deviceId;
            }
          }
        }
      });
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: videoId,
        },
        audio: true,
      });
      localVideo.srcObject = stream;
    } catch (err) {
      notice("获取摄像头/麦克风失败!", "error");
      reject(err);
    }
    try {
      stream.getTracks().map((track) => {
        peer.addTrack(track, stream);
      });
    } catch (error) {
      console.log("addTrack error");
    }
    resolve(stream);
  });
}

// 通知提醒
function notice(text, type, time = 3000) {
  let notice = document.getElementById("notice");
  let noticeIcon = document.getElementById("noticeIcon");
  let noticeText = document.getElementById("noticeText");
  if (notice.style.display === "none") {
    notice.style.display = "block";
    notice.style.zIndex = "1024";
    $("#notice").animate({
      top: "30px",
    });
    noticeText.innerHTML = text;
    if (type === "success") {
      notice.style.border = "1px solid rgba(20,141,249,1)";
      notice.style.boxShadow = "inset 0 0 15px rgba(20,141,249,0.5)";
      noticeIcon.style.background = 'url("../assets/success.png") no-repeat';
    } else if (type === "error") {
      notice.style.border = "1px solid rgba(255,0,0,1)";
      notice.style.boxShadow = "inset 0 0 15px rgba(255,0,0,0.5)";
      noticeIcon.style.background = 'url("../assets/error.png") no-repeat';
    } else {
      notice.style.border = "1px solid rgba(234,149,39,1)";
      notice.style.boxShadow = "inset 0 0 15px rgba(234,149,39,0.5)";
      noticeIcon.style.background = 'url("../assets/warn.png") no-repeat';
    }
    if (time) {
      setTimeout(function () {
        notice.style.display = "none";
        $("#notice").animate({ top: "0" });
      }, time);
    }
  } else {
    return;
  }
}

function closeNotice() {
  document.getElementById("notice").style.display = "none";
  $("#notice").animate({ top: "0" });
}

// 删除图片
function deleteImg(type) {
  let imgUrl = "../assets/photo.png";
  switch (type) {
    case "idCard":
      deleteImgHandler("idCardUrl", imgUrl);
      break;
    case "spot":
      deleteImgHandler("headPortraitUrl", imgUrl);
      break;
    case "lawyer":
      deleteImgHandler("lawyerUrl", imgUrl);
      break;
    case "firm":
      deleteImgHandler("certificationUrl", imgUrl);
      break;
    case "attorney":
      deleteImgHandler("attorneyUrl", imgUrl);
      break;
  }
}

function deleteImgHandler(attr, imgUrl) {
  let element = document.querySelector(`[data-name=${attr}]`);
  element.src = imgUrl;
}
