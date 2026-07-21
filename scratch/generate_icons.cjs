const { Jimp } = require('jimp');

async function generateIcons() {
  try {
    const original = await Jimp.read('../public/mokundo.jpg');
    
    // Autocrop to get the raw logo
    original.autocrop();
    
    // We will create a perfectly padded maskable 512x512 icon
    // For maskable, safe zone is inner 80%.
    // So the logo should fit within roughly 350x350 box.
    const logo512 = original.clone();
    logo512.scaleToFit({ w: 340, h: 340 });
    
    const bg512 = new Jimp({ width: 512, height: 512, color: '#233d44' });
    
    // Geometric center
    let x512 = (512 - logo512.bitmap.width) / 2;
    let y512 = (512 - logo512.bitmap.height) / 2;
    
    // Shift right to fix visual balance (the cup body is on the left, handle on right)
    // Shift by roughly 5% of the width
    x512 += 12; 
    
    bg512.composite(logo512, x512, y512);
    
    await bg512.write('../public/pwa-512x512.png');
    await bg512.write('../public/pwa-512x512-maskable.png');
    
    // 192x192
    const bg192 = bg512.clone();
    bg192.resize({ w: 192, h: 192 });
    await bg192.write('../public/pwa-192x192.png');
    
    // Splash icon (needs to be bigger)
    const logoSplash = original.clone();
    logoSplash.scaleToFit({ w: 420, h: 420 }); // bigger for splash
    
    const bgSplash = new Jimp({ width: 512, height: 512, color: '#233d44' });
    let xSplash = (512 - logoSplash.bitmap.width) / 2;
    let ySplash = (512 - logoSplash.bitmap.height) / 2;
    xSplash += 15; // visual shift
    bgSplash.composite(logoSplash, xSplash, ySplash);
    await bgSplash.write('../public/splash-icon.jpg');
    
    // Main mokundo.jpg (update it to be visually centered too, 1080x1080)
    const logoMain = original.clone();
    logoMain.scaleToFit({ w: 720, h: 720 });
    const bgMain = new Jimp({ width: 1080, height: 1080, color: '#233d44' });
    let xMain = (1080 - logoMain.bitmap.width) / 2;
    let yMain = (1080 - logoMain.bitmap.height) / 2;
    xMain += 30; // visual shift
    bgMain.composite(logoMain, xMain, yMain);
    await bgMain.write('../public/mokundo.jpg');
    
    console.log('All icons generated professionally!');
  } catch (err) {
    console.error(err);
  }
}
generateIcons();
