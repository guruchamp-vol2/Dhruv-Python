// This file will contain the base64 encoded image data
// Please copy the entire output from the convert-images.html page and replace this content

// Character image data as base64 strings
const characterImageData = {
  // Your actual base64 data will go here
  // Example:
  // mario: "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  // luigi: "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  // etc...
};

// Function to create an image element from base64 data
function createImageFromBase64(base64Data) {
  const img = new Image();
  img.src = base64Data;
  return img;
}

// Export the functions and data
window.characterImageData = characterImageData;
window.createImageFromBase64 = createImageFromBase64; 