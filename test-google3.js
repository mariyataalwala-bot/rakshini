const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/search?q=best+cricket+tickets');
  win.webContents.on('did-finish-load', async () => {
    // Inject indexer.js
    const fs = require('fs');
    const indexerCode = fs.readFileSync(require('path').join(__dirname, 'indexer.js'), 'utf8');
    await win.webContents.executeJavaScript(indexerCode);
    
    // Check results
    const js = `
      window.__opObserverRunning();
      Array.from(document.querySelectorAll('.op-bounding-box')).length;
    `;
    const count = await win.webContents.executeJavaScript(js);
    console.log("BOUNDING BOXES:", count);
    
    const elementsJS = `
      Array.from(document.querySelectorAll('.op-text-label')).map(el => {
        const idMatch = el.innerText.match(/([A-Z]{3}_\\d{3})/);
        return idMatch ? idMatch[1] : null;
      }).filter(id => id && id.startsWith('LNK_')).slice(0, 15);
    `;
    const labels = await win.webContents.executeJavaScript(elementsJS);
    console.log("LABELS:", JSON.stringify(labels));
    app.quit();
  });
});
