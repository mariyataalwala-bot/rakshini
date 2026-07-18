const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/search?q=best+cricket+tickets');
  win.webContents.on('did-finish-load', async () => {
    // Inject indexer.js
    const fs = require('fs');
    const indexerCode = fs.readFileSync(require('path').join(__dirname, 'indexer.js'), 'utf8');
    await win.webContents.executeJavaScript(indexerCode);
    
    const js = `
      window.__opObserverRunning();
      window.__op_elements || [];
    `;
    const res = await win.webContents.executeJavaScript(js);
    const result = res.filter(e => e.text.includes('Cricket')).map(e => ({id: e.id, text: e.text}));
    console.log("FINAL ELEMENTS:\n", JSON.stringify(result, null, 2));
    app.quit();
  });
});
