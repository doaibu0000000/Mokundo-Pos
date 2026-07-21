const { Jimp } = require('jimp');

async function generateIcons() {
  try {
    const original = await Jimp.read('C:/Users/doaib/OneDrive/Pictures/mokundo.jpg');
    
    // Autocrop to get the raw logo (just the cup)
    original.autocrop();
    
    // 1. Maskable Icon (512x512)
    const logo512 = original.clone();
    logo512.scaleToFit({ w: 260, h: 260 }); 
    
    const bg512 = new Jimp({ width: 512, height: 512, color: '#233d44' });
    let x512 = (512 - logo512.bitmap.width) / 2;
    let y512 = (512 - logo512.bitmap.height) / 2;
    
    // Shift slightly right to perfectly balance the cup body and handle
    // Previously: +8 (too left), +35 (too right). Let's use +18.
    x512 += 18; 
    
    bg512.composite(logo512, x512, y512);
    
    await bg512.write('../public/pwa-512x512.png');
    await bg512.write('../public/pwa-512x512-maskable.png');
    
    // 2. 192x192
    const bg192 = bg512.clone();
    bg192.resize({ w: 192, h: 192 });
    await bg192.write('../public/pwa-192x192.png');
    
    // 3. Splash icon
    const logoSplash = original.clone();
    logoSplash.scaleToFit({ w: 320, h: 320 }); 
    
    const bgSplash = new Jimp({ width: 512, height: 512, color: '#233d44' });
    let xSplash = (512 - logoSplash.bitmap.width) / 2;
    let ySplash = (512 - logoSplash.bitmap.height) / 2;
    xSplash += 22; // proportionate shift
    bgSplash.composite(logoSplash, xSplash, ySplash);
    await bgSplash.write('../public/splash-icon.jpg');
    
    // 4. Main mokundo.jpg (1080x1080)
    const logoMain = original.clone();
    logoMain.scaleToFit({ w: 540, h: 540 });
    const bgMain = new Jimp({ width: 1080, height: 1080, color: '#233d44' });
    let xMain = (1080 - logoMain.bitmap.width) / 2;
    let yMain = (1080 - logoMain.bitmap.height) / 2;
    xMain += 38; // proportionate shift
    bgMain.composite(logoMain, xMain, yMain);
    await bgMain.write('../public/mokundo.jpg');
    
    console.log('Icons perfectly centered visually!');
  } catch (err) {
    console.error(err);
  }
}
generateIcons();
