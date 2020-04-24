var realUserMediaCall = window.navigator.mediaDevices.getUserMedia;

var realVideo = document.createElement("video");
realVideo.setAttribute("id", "realVideo");
document.body.appendChild(realVideo);

window.navigator.mediaDevices.getUserMedia = async function (constraints) {
    debugger;
    console.log("GetUserMedia was called with constraints:");
    console.log(constraints);
    var canvas = document.getElementById("sourceCanvas");
    console.log(canvas);
    var res = canvas.captureStream();
    res.getVideoTracks = function(){
        console.log("GetVideoTracks was called");
        res.label = "MopsCam";
        return [res];
    }
    var stream = await realUserMediaCall.call(navigator.mediaDevices, constraints);
    realVideo.height = 400;
    realVideo.width = 400;
    realVideo.srcObject = stream;

    return res;
}