const { app, desktopCapturer } = require('electron');
const { createWorker } = require('tesseract.js');
app.whenReady().then(async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    const worker = await createWorker('eng');
    const result = await worker.recognize(sources[0].thumbnail.toPNG(), {}, { blocks: true, text: true });
    
    let words = [];
    if (result.data.blocks) {
      result.data.blocks.forEach(b => {
        if (b.paragraphs) b.paragraphs.forEach(p => {
          if (p.lines) p.lines.forEach(l => {
            if (l.words) words.push(...l.words);
          })
        })
      });
    }
    words.forEach(w => {
      console.log(`${w.text} at x:${w.bbox.x0} y:${w.bbox.y0} w:${w.bbox.x1 - w.bbox.x0} h:${w.bbox.y1 - w.bbox.y0}`);
    });
    await worker.terminate();
  } catch(e) { console.error(e) } finally { app.quit() }
});
