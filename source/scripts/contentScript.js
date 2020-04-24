import * as bodyPix from "@tensorflow-models/body-pix";
import browser from "webextension-polyfill";

const state = {
  video: null,
  image: null,
  net: null,
  canvas: null,
};

async function overrideGetUserMedia() {
  var canvas = document.createElement("canvas");
  canvas.setAttribute("id", "sourceCanvas");
  (document.body || document.documentElement).appendChild(canvas);
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

function toMask(
  personOrPartSegmentation,
  foreground,
  background,
  drawContour,
  foregroundIds
) {
  if (foreground === void 0) {
    foreground = {
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    };
  }
  if (background === void 0) {
    background = {
      r: 0,
      g: 0,
      b: 0,
      a: 255,
    };
  }
  if (drawContour === void 0) {
    drawContour = false;
  }
  if (foregroundIds === void 0) {
    foregroundIds = [1];
  }
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
  var _a = multiPersonOrPartSegmentation[0],
    width = _a.width,
    height = _a.height;
  var bytes = new Uint8ClampedArray(width * height * 4);
  function drawStroke(bytes, row, column, width, radius, color) {
    if (color === void 0) {
      color = { r: 0, g: 255, b: 255, a: 255 };
    }
    for (var i = -radius; i <= radius; i++) {
      for (var j = -radius; j <= radius; j++) {
        if (i !== 0 && j !== 0) {
          var n = (row + i) * width + (column + j);
          bytes[4 * n + 0] = color.r;
          bytes[4 * n + 1] = color.g;
          bytes[4 * n + 2] = color.b;
          bytes[4 * n + 3] = color.a;
        }
      }
    }
  }
  function isSegmentationBoundary(
    segmentationData,
    row,
    column,
    width,
    foregroundIds,
    radius
  ) {
    if (foregroundIds === void 0) {
      foregroundIds = [1];
    }
    if (radius === void 0) {
      radius = 1;
    }
    var numberBackgroundPixels = 0;
    for (var i = -radius; i <= radius; i++) {
      var _loop_2 = function (j) {
        if (i !== 0 && j !== 0) {
          var n_1 = (row + i) * width + (column + j);
          if (
            !foregroundIds.some(function (id) {
              return id === segmentationData[n_1];
            })
          ) {
            numberBackgroundPixels += 1;
          }
        }
      };
      for (var j = -radius; j <= radius; j++) {
        _loop_2(j);
      }
    }
    return numberBackgroundPixels > 0;
  }
  var imageData = state.image.data;
  for (var i = 0; i < height; i += 1) {
    debugger;
    var _loop_1 = function (j) {
      var n = i * width + j;
      bytes[4 * n + 0] = imageData[4 * n + 0];
      bytes[4 * n + 1] = imageData[4 * n + 1];
      bytes[4 * n + 2] = imageData[4 * n + 2];
      bytes[4 * n + 3] = imageData[4 * n + 3];
      var _loop_3 = function (k) {
        if (
          foregroundIds.some(function (id) {
            return id === multiPersonOrPartSegmentation[k].data[n];
          })
        ) {
          bytes[4 * n] = foreground.r;
          bytes[4 * n + 1] = foreground.g;
          bytes[4 * n + 2] = foreground.b;
          bytes[4 * n + 3] = foreground.a;
          var isBoundary = isSegmentationBoundary(
            multiPersonOrPartSegmentation[k].data,
            i,
            j,
            width,
            foregroundIds
          );
          if (
            drawContour &&
            i - 1 >= 0 &&
            i + 1 < height &&
            j - 1 >= 0 &&
            j + 1 < width &&
            isBoundary
          ) {
            drawStroke(bytes, i, j, width, 1);
          }
        }
      };
      for (var k = 0; k < multiPersonOrPartSegmentation.length; k++) {
        _loop_3(k);
      }
    };
    for (var j = 0; j < width; j += 1) {
      _loop_1(j);
    }
  }
  return new ImageData(bytes, width, height);
}

function realVideoAdded(video) {
  state.video = video;
  video.onloadedmetadata = function () {
    var background = new Image();
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
      "https://images.unsplash.com/photo-1585384107568-5bc588c7eefd?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=" +
      state.video.width +
      "&q=80";
  };
}

async function start() {
  await loadBodyPix();
  overrideGetUserMedia();
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
    debugger;
    var multiPersonSegmentation = await estimateSegmentation();
    if (multiPersonSegmentation) {
      const foregroundColor = { r: 255, g: 255, b: 255, a: 0 };
      const backgroundColor = { r: 0, g: 0, b: 0, a: 255 };
      const mask = toMask(
        multiPersonSegmentation,
        foregroundColor,
        backgroundColor,
        false
      );
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
  console.log("Loaded net baby");
  console.log(state);
}
async function estimateSegmentation() {
  return await state.net?.segmentPerson(state.video, {
    internalResolution: "medium",
    segmentationThreshold: 0.8,
    maxDetections: 1,
    scoreThreshold: 0.3,
    nmsRadius: 20,
  });
}

start();
