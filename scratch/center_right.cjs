const { Jimp } = require('jimp');

async function generateIcons() {
  try {
    // We read the original image (it might have been modified by generate_icons.cjs? 
    // Wait, in generate_smaller_icons.cjs I overwrote mokundo.jpg!
    // If I overwrote mokundo.jpg, its bounding box might already include the shift!
    // To be safe, I should read the original from C:\Users\doaib\OneDrive\Pictures\mokundo.jpg
    const original = await Jimp.read('C:/Users/doaib/OneDrive/Pictures/mokundo.jpg');
    
    // Autocrop to get the raw logo (just the cup)
    original.autocrop();
    
    // 1. Maskable Icon (512x512)
    const logo512 = original.clone();
    logo512.scaleToFit({ w: 260, h: 260 }); // smaller size as requested before
    
    const bg512 = new Jimp({ width: 512, height: 512, color: '#233d44' });
    let x512 = (512 - logo512.bitmap.width) / 2;
    let y512 = (512 - logo512.bitmap.height) / 2;
    
    // Shift significantly to the right to visually center the cup body
    x512 += 35; 
    
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
    xSplash += 42; // proportionate shift
    bgSplash.composite(logoSplash, xSplash, ySplash);
    await bgSplash.write('../public/splash-icon.jpg');
    
    // 4. Main mokundo.jpg (1080x1080)
    const logoMain = original.clone();
    logoMain.scaleToFit({ w: 540, h: 540 });
    const bgMain = new Jimp({ width: 1080, height: 1080, color: '#233d44' });
    let xMain = (1080 - logoMain.bitmap.width) / 2;
    let yMain = (1080 - logoMain.bitmap.height) / 2;
    xMain += 74; // proportionate shift
    bgMain.composite(logoMain, xMain, yMain);
    await bgMain.write('../public/mokundo.jpg');
    
    console.log('Icons shifted to the right for visual centering!');
  } catch (err) {
    console.error(err);
  }
}
generateIcons();
