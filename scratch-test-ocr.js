const { app, desktopCapturer } = require('electron');
const Tesseract = require('tesseract.js');
const fs = require('fs');

app.whenReady().then(async () => {
  console.log("Capturing screen...");
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
  if (sources.length > 0) {
    const imgBuf = sources[0].thumbnail.toPNG();
    fs.writeFileSync('screenshot.png', imgBuf);
    console.log("Saved screenshot.png");
    
    console.log("Running OCR...");
    const start = Date.now();
    const { data: { words } } = await Tesseract.recognize(
      imgBuf,
      'eng',
      { logger: m => console.log(m.status, m.progress) }
    );
    console.log(`OCR took ${Date.now() - start}ms`);
    console.log(`Found ${words.length} words.`);
    if(words.length > 0) {
      console.log("Sample word:", words[0].text, words[0].bbox);
    }
  }
  app.quit();
});
