import * as bodyPix from "@tensorflow-models/body-pix";
import browser from "webextension-polyfill";

const state = {
  video: null,
  image: null,
  net: null,
  canvas: null,
  backgroundImage: null,
  backgroundSrc: null,
  gameIsOn: true,
  maskingFrameCounter: 0,
  maskCache: null,
};

async function overrideGetUserMedia() {
  var canvas = document.createElement("canvas");
  canvas.setAttribute("id", "sourceCanvas");
  canvas.setAttribute("style", "display:none");
  document.documentElement.appendChild(canvas);
  state.canvas = canvas;

  injectMediaSourceSwap();

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
  var bytes = new Uint8ClampedArray(state.image.data);
  for (var i = 0; i < height; i += 1) {
    for (var j = 0; j < width; j += 1) {
      var n = i * width + j;
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
    state.canvas.width = state.video.width;
    state.canvas.height = state.video.height;
    background.height = state.video.height;
    background.width = state.video.width;
    background.crossOrigin = "Anonymous";

    function outputsize() {
      state.backgroundImage.width = state.video.width;
      state.backgroundImage.height = state.video.height;
    }
    new ResizeObserver(outputsize).observe(state.video);

    background.onload = function () {
      var imageCanvas = document.createElement("canvas");
      imageCanvas.width = background.width;
      imageCanvas.height = background.height;
      var ctx = imageCanvas.getContext("2d");
      ctx.drawImage(background, 0, 0, background.width, background.height);

      var imgWidth = background.width || background.naturalWidth;
      var imgHeight = background.height || background.naturalHeight;
      var imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
      state.image = imageData;

      state.video.play();
      segmentBodyInRealTime();
    };

    if (state.backgroundSrc.includes("unsplash")){
      state.backgroundSrc =
      state.backgroundSrc.split("&w=")[0] +
      "&fit=crop&w=" +
      state.video.width;
    }

    background.src = state.backgroundSrc;
  };
}

async function start() {
  await loadState();
  overrideGetUserMedia();
  await loadBodyPix();
}

async function loadState() {
  state.gameIsOn = (await browser.storage.sync.get(["gameIsOn"])).gameIsOn;
  debugger;
  let backImage = (await browser.storage.local.get(["backgroundSrc"]))
    .backgroundSrc;
  state.backgroundSrc = backImage.src;
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
    if (state.gameIsOn) {
      if (state.maskingFrameCounter == 0) {
        debugger;
        var multiPersonSegmentation = await estimateSegmentation();
        state.maskCache = toMask(multiPersonSegmentation);
      }
      bodyPix.drawMask(state.canvas, state.video, state.maskCache, 1, 0, false);
      state.maskingFrameCounter++;
      if (state.maskingFrameCounter == 40) {
        state.maskingFrameCounter = 0;
      }
    } else {
      var ctx = state.canvas.getContext("2d");
      ctx.drawImage(state.video, 0, 0);
    }

    requestAnimationFrame(bodySegmentationFrame);
  }

  bodySegmentationFrame();
}

async function loadBodyPix() {
  state.net = await bodyPix.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    multiplier: 1,
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

browser.storage.onChanged.addListener(function (changes) {
  if (changes["backgroundSrc"]) {
    debugger;
    var backgroundImg = changes["backgroundSrc"].newValue;
    var backgroundImgSource = backgroundImg.src;
    if (!backgroundImg.isCustom) {
      backgroundImgSource =
        backgroundImgSource.split("&w=")[0] +
        "&fit=crop&w=" +
        state.video.width;
    }

    state.backgroundSrc = backgroundImgSource;
    state.backgroundImage.src = backgroundImgSource;
    state.backgroundImage.height = state.video.height;
    state.backgroundImage.width = state.video.width;
  }
  if (changes["gameIsOn"]) {
    state.gameIsOn = changes["gameIsOn"].newValue;
  }
});
start();
