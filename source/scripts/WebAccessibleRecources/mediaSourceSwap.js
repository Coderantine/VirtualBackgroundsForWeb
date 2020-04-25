var realUserMediaCall = window.navigator.mediaDevices.getUserMedia;

window.navigator.mediaDevices.getUserMedia = async function (constraints) {
  debugger;
  console.log("GetUserMedia was called with constraints:");
  console.log(constraints);

  if (constraints.video.deviceId) {
    var canvas = document.getElementById("sourceCanvas");
    console.log(canvas);
    var stream = await realUserMediaCall.call(
      navigator.mediaDevices,
      constraints
    );
    var res = canvas.captureStream();
    var videoTrack = res.getVideoTracks()[0];
    var videoTrackStop = videoTrack.stop;
    videoTrack.stop = function () {
      stream.getVideoTracks()[0].stop();
      videoTrackStop.call(videoTrack);
    };
    
    var videoElement = tryGetVideoElement();
    videoElement.height = 400;
    videoElement.width = 400;
    videoElement.srcObject = stream;

    return res;
  } else {
    return await realUserMediaCall.call(navigator.mediaDevices, constraints);
  }
};

function tryGetVideoElement() {
  var existingElement = document.getElementById("realVideo");
  if (existingElement) {
    return existingElement;
  }
  var realVideo = document.createElement("video");
  realVideo.setAttribute("id", "realVideo");
  realVideo.setAttribute("style", "display:none");
  document.documentElement.appendChild(realVideo);
  return realVideo;
}
