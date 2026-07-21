const { Jimp } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('../public/mokundo.jpg');
    console.log('Original:', image.bitmap.width, image.bitmap.height);
    
    image.autocrop();
    console.log('After autocrop:', image.bitmap.width, image.bitmap.height);
    
    // Scale it to take up most of a 512x512 space (e.g. 420x420 max)
    image.scaleToFit({ w: 420, h: 420 });
    
    // Create new background
    const bg = new Jimp({ width: 512, height: 512, color: '#233d44' });
    
    // Composite
    const x = (512 - image.bitmap.width) / 2;
    const y = (512 - image.bitmap.height) / 2;
    
    bg.composite(image, x, y);
    
    await bg.write('../public/splash-icon.jpg');
    console.log('Saved splash-icon.jpg');
  } catch (err) {
    console.error('Error:', err);
  }
}
processImage();
