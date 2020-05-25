import browser from 'webextension-polyfill';

var photos = null;
const image_container = document.querySelector(".images")

const createImageGallery = images => {
  photos = images;
  let output = ""
  for (var i = 0; i< images.length; i++){
    output += `<div class="image_item"><img src="${images[i].src}" isCustom="${images[i].isCustom}" class="image_item_inner"/></div>`
  }

  image_container.innerHTML = output
}

const changeImage = e => {
  if (e.target.src) {
    clearExistingSelection();
    e.target.parentElement.classList.add("selected_image");
    browser.storage.local.set({"backgroundSrc": {"src":e.target.src, "isCustom":e.target.getAttribute("isCustom")}});
  }
}

function loadPhotos(){
 browser.storage.local.get(['photos'])
 .then(result => createImageGallery(result.photos));
 browser.storage.local.get(['backgroundSrc'])
 .then(res =>{
   clearExistingSelection();
   debugger;
   function getChildImage(element){
    for (var i = 0; i < element.childNodes.length; i++) {
        if (element.childNodes[i].tagName == "IMG") {
          return element.childNodes[i];
        }        
    }
  }
   var existingImages = document.getElementsByClassName("image_item");
   debugger;

    for (var i = 0; i < existingImages.length; i++) {
      var childImage = getChildImage(existingImages[i]);
      
      if (childImage.src.includes(res.backgroundSrc.src)){
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

window.onload = function() {
  let imageInput = document.getElementById('image_input');
  document.getElementById('image_input_button').addEventListener('click', openDialog);
  imageInput.addEventListener("change", imageUploaded);
  function openDialog() {
    imageInput.click();
  }

  function imageUploaded(){
    if (imageInput.files.length != 0){
      for (let i = 0; i < imageInput.files.length; i++) {
        debugger;
        const img = imageInput.files[i];
        var reader = new FileReader();
        reader.onload = function(){
          var dataURL = reader.result;
          addToPhotos(dataURL);
        };
        reader.readAsDataURL(img);
      }
    }
  }

  function addToPhotos(url){
    browser.storage.local.get(['photos'])
      .then(result => {
        var array = result["photos"]?result["photos"]:[];
        debugger;
        var newItem = {"src":url, "isCustom":true};
        array.unshift(newItem);
        browser.storage.local.set({'photos':array});
        browser.storage.local.set({'backgroundSrc':newItem});
        loadPhotos();
      });
  }
}
