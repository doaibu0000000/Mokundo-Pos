const { Jimp } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('../public/mokundo.jpg');
    image.autocrop();
    // Scale it to take up almost the full 512x512 space (480 max)
    image.scaleToFit({ w: 480, h: 480 });
    
    // Create new background
    const bg = new Jimp({ width: 512, height: 512, color: '#233d44' });
    
    // Composite
    const x = (512 - image.bitmap.width) / 2;
    const y = (512 - image.bitmap.height) / 2;
    
    bg.composite(image, x, y);
    
    await bg.write('../public/splash-icon.jpg');
    console.log('Saved larger splash-icon.jpg');
  } catch (err) {
    console.error('Error:', err);
  }
}
processImage();
