const { Jimp } = require('jimp');

async function generateSplash() {
  try {
    const original = await Jimp.read('C:/Users/doaib/OneDrive/Pictures/mokundo.jpg');
    
    // Autocrop to get the raw logo (just the cup)
    original.autocrop();
    
    // Splash icon
    const logoSplash = original.clone();
    
    // Increase size from 320 to 380 (middle ground for professional look)
    logoSplash.scaleToFit({ w: 380, h: 380 }); 
    
    const bgSplash = new Jimp({ width: 512, height: 512, color: '#233d44' });
    let xSplash = (512 - logoSplash.bitmap.width) / 2;
    let ySplash = (512 - logoSplash.bitmap.height) / 2;
    
    // Proportional visual shift to the right to keep it centered
    xSplash += 26; 
    
    bgSplash.composite(logoSplash, xSplash, ySplash);
    await bgSplash.write('../public/splash-icon.jpg');
    
    console.log('Splash icon resized to optimal professional size!');
  } catch (err) {
    console.error(err);
  }
}
generateSplash();
