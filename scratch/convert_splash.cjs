const { Jimp } = require('jimp');

async function fixSplash() {
  try {
    const splash = await Jimp.read('../public/splash-icon.jpg');
    await splash.write('../public/splash-icon.png');
    console.log('Saved as PNG!');
  } catch(e) {
    console.error(e);
  }
}
fixSplash();
