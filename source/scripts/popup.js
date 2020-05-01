import browser from 'webextension-polyfill';

var photos = null;
const image_container = document.querySelector(".images")

const createImageGallery = images => {
  photos = images;
  let output = ""
  for (var i = 0; i< images.length; i++){
    output += `<img src="${images[i].src}" class="image_item" />`
  }

  image_container.innerHTML = output
}

const changeImage = e => {
  if (e.target.src) {
    clearExistingSelection();
    e.target.classList.add("selected_image");
    browser.storage.sync.set({"backgroundSrc": e.target.src});
  }
}

function loadPhotos(){
 browser.storage.sync.get(['photos'])
 .then(result => createImageGallery(result.photos));
 browser.storage.sync.get(['backgroundSrc'])
 .then(res =>{
   clearExistingSelection();
   var existingImages = document.getElementsByClassName("image_item");
    for (var i = 0; i < existingImages.length; i++) {
      if (existingImages[i].src.includes(res.backgroundSrc)){
        existingImages[i].classList.add("selected_image");
        return;
      }
    }
 })
}

function clearExistingSelection(){
    var existingImages = document.getElementsByClassName("image_item");
    for (var i = 0; i < existingImages.length; i++) {
        existingImages[i].classList.remove("selected_image");
    }
}

image_container.addEventListener("click", changeImage)
const switchControl = new mdc.switchControl.MDCSwitch.attachTo(document.querySelector('#main_switch'));
browser.storage.sync
    .get(["gameIsOn"])
    .then((result) => switchControl.checked = result.gameIsOn);
switchControl.listen('change', ()=>{
  browser.storage.sync.set({"gameIsOn": switchControl.checked});
})
loadPhotos();