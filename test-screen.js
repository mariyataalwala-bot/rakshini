const { app, screen, desktopCapturer } = require('electron');
app.whenReady().then(async () => {
  const display = screen.getPrimaryDisplay();
  console.log("Screen bounds:", display.bounds);
  console.log("Screen scale factor:", display.scaleFactor);
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
  console.log("Thumbnail size:", sources[0].thumbnail.getSize());
  app.quit();
});
