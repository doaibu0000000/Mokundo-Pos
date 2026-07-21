const { Jimp } = require('jimp');

async function generateIcons() {
  try {
    const original = await Jimp.read('../public/mokundo.jpg'); // Currently mokundo.jpg is the one we generated! 
    // Wait, if mokundo.jpg is the ONE WE GENERATED, it has the cup already scaled!
    // So autocrop will crop the cup again. That's fine, autocrop works.
    original.autocrop();
    
    // We want the cup to be smaller so it has more breathing room.
    
    // 1. Maskable Icon (512x512)
    // Safe zone is 409px diameter. We'll make the logo 260px max.
    const logo512 = original.clone();
    logo512.scaleToFit({ w: 260, h: 260 });
    
    const bg512 = new Jimp({ width: 512, height: 512, color: '#233d44' });
    let x512 = (512 - logo512.bitmap.width) / 2;
    let y512 = (512 - logo512.bitmap.height) / 2;
    x512 += 8; // Slight visual shift
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
    xSplash += 10;
    bgSplash.composite(logoSplash, xSplash, ySplash);
    await bgSplash.write('../public/splash-icon.jpg');
    
    // 4. Main mokundo.jpg (1080x1080)
    const logoMain = original.clone();
    logoMain.scaleToFit({ w: 540, h: 540 });
    const bgMain = new Jimp({ width: 1080, height: 1080, color: '#233d44' });
    let xMain = (1080 - logoMain.bitmap.width) / 2;
    let yMain = (1080 - logoMain.bitmap.height) / 2;
    xMain += 20; 
    bgMain.composite(logoMain, xMain, yMain);
    await bgMain.write('../public/mokundo.jpg');
    
    console.log('Icons made smaller and generated successfully!');
  } catch (err) {
    console.error(err);
  }
}
generateIcons();
