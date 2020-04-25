import * as bodyPix from "@tensorflow-models/body-pix";
import browser from "webextension-polyfill";

const state = {
  video: null,
  image: null,
  net: null,
  canvas: null,
  backgroundImage: null,
};

async function overrideGetUserMedia() {
  injectMediaSourceSwap();

  var canvas = document.createElement("canvas");
  canvas.setAttribute("id", "sourceCanvas");
  canvas.setAttribute("style", "display:none");
  document.documentElement.appendChild(canvas);
  state.canvas = canvas;

  // set up the mutation observer
  var observer = new MutationObserver(function (mutations, me) {
    // `mutations` is an array of mutations that occurred
    // `me` is the MutationObserver instance
    var canvas = document.getElementById("realVideo");
    if (canvas) {
      realVideoAdded(canvas);
      me.disconnect(); // stop observing
      return;
    }
  });

  // start observing
  observer.observe(document, {
    childList: true,
    subtree: true,
  });
}

function toMask(personOrPartSegmentation) {
  if (
    Array.isArray(personOrPartSegmentation) &&
    personOrPartSegmentation.length === 0
  ) {
    return null;
  }
  var multiPersonOrPartSegmentation;
  if (!Array.isArray(personOrPartSegmentation)) {
    multiPersonOrPartSegmentation = [personOrPartSegmentation];
  } else {
    multiPersonOrPartSegmentation = personOrPartSegmentation;
  }
  var width = multiPersonOrPartSegmentation[0].width;
  var height = multiPersonOrPartSegmentation[0].height;
  var bytes = new Uint8ClampedArray(width * height * 4);
  var imageData = state.image.data;
  for (var i = 0; i < height; i += 1) {
    for (var j = 0; j < width; j += 1) {
      var n = i * width + j;
      bytes[4 * n + 0] = imageData[4 * n + 0];
      bytes[4 * n + 1] = imageData[4 * n + 1];
      bytes[4 * n + 2] = imageData[4 * n + 2];
      bytes[4 * n + 3] = imageData[4 * n + 3];
      for (var k = 0; k < multiPersonOrPartSegmentation.length; k++) {
        if (multiPersonOrPartSegmentation[k].data[n] == 1) {
          bytes[4 * n] = 0;
          bytes[4 * n + 1] = 0;
          bytes[4 * n + 2] = 0;
          bytes[4 * n + 3] = 0;
        }
      }
    }
  }
  return new ImageData(bytes, width, height);
}

function realVideoAdded(video) {
  state.video = video;
  video.onloadedmetadata = function () {
    var background = new Image();
    state.backgroundImage = background;
    background.setAttribute("style", "object-fit: cover");
    state.video.width = state.video.videoWidth;
    state.video.height = state.video.videoHeight;
    background.height = state.video.height;
    background.width = state.video.width;
    background.crossOrigin = "Anonymous";
    background.onload = function () {
      var imageCanvas = document.createElement("canvas");
      imageCanvas.width = background.width;
      imageCanvas.height = background.height;
      var ctx = imageCanvas.getContext("2d");
      ctx.drawImage(
        background,
        0,
        0,
        background.width,
        background.height,
        0,
        0,
        background.width,
        background.height
      );

      var imgWidth = background.width || background.naturalWidth;
      var imgHeight = background.height || background.naturalHeight;
      var imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
      state.image = imageData;

      state.video.play();
      segmentBodyInRealTime();
    };

    background.src =
      "https://images.unsplash.com/photo-1573871891393-45521a8e8d85?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=" +
      state.video.width +
      "&q=80";
  };
}

async function start() {
  overrideGetUserMedia();
  await loadBodyPix();
}

function injectMediaSourceSwap() {
  // from https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script
  var script = document.createElement("script");
  script.src = browser.runtime.getURL("js/mediaSourceSwap.js");
  script.onload = function () {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

function segmentBodyInRealTime() {
  async function bodySegmentationFrame() {
    var multiPersonSegmentation = await estimateSegmentation();
    if (multiPersonSegmentation) {
      const mask = toMask(multiPersonSegmentation);
      bodyPix.drawMask(state.canvas, state.video, mask, 1, 2, false);
    }

    requestAnimationFrame(bodySegmentationFrame);
  }

  bodySegmentationFrame();
}

async function loadBodyPix() {
  state.net = await bodyPix.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2,
  });
}
async function estimateSegmentation() {
  return await state.net?.segmentPerson(state.video, {
    internalResolution: "low",
    segmentationThreshold: 0.8,
    maxDetections: 1,
    scoreThreshold: 0.3,
    nmsRadius: 20,
  });
}

browser.storage.onChanged.addListener(function(changes) {
  if(changes["backgroundSrc"]) {
      state.backgroundImage.src = changes["backgroundSrc"].newValue.split("&w=")[0] + "&fit=max&w=" +
      state.video.width +
      "&q=80";
  }
});

start();
