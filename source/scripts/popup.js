import browser from 'webextension-polyfill';

const photos = [
  {
    src: "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&w=400&fit=max",
  },
  {
    src: "https://images.unsplash.com/photo-1461301214746-1e109215d6d3?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&w=400&fit=max",
  },
  {
    src: "https://images.unsplash.com/photo-1458682625221-3a45f8a844c7?ixlib=rb-1.2.1&w=400&fit=max",
  },
  {
    src: "https://images.unsplash.com/photo-1488409688217-e6053b1e8f42?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&w=400&fit=max",
  },
  {
    src: "https://images.unsplash.com/photo-1481277542470-605612bd2d61?ixlib=rb-1.2.1&w=400&fit=max",
  },
  {
    src: "https://images.unsplash.com/photo-1521334884684-d80222895322?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&w=400&fit=max",
  },
];

const image_container = document.querySelector(".images")

const createImageGallery = images => {
  let output = ""

  images.forEach((img) => {
    output += `<img src="${img.src}" class="image_item" />`
  })
  image_container.innerHTML = output
}

const changeImage = e => {
  if (e.target.src) {
    browser.storage.local.set({"backgroundSrc": e.target.src});
  }
}


image_container.addEventListener("click", changeImage)
createImageGallery(photos);