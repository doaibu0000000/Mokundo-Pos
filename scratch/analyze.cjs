const { Jimp } = require('jimp');

async function analyze() {
  try {
    const img = await Jimp.read('../public/mokundo.jpg');
    console.log('width:', img.bitmap.width, 'height:', img.bitmap.height);
    console.log('top-left:', img.getPixelColor(0, 0).toString(16));
    console.log('top-right:', img.getPixelColor(img.bitmap.width-1, 0).toString(16));
    console.log('center:', img.getPixelColor(img.bitmap.width/2, img.bitmap.height/2).toString(16));
    console.log('mid-left:', img.getPixelColor(0, img.bitmap.height/2).toString(16));
  } catch (err) {
    console.error(err);
  }
}
analyze();
