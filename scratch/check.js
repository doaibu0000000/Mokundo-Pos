const Jimp = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('../public/mokundo.jpg');
    console.log('Original:', image.bitmap.width, image.bitmap.height);
  } catch (err) {
    console.error(err);
  }
}
processImage();
