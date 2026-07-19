const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/search?q=cheapest+iphone');
  win.webContents.on('did-finish-load', async () => {
    const fs = require('fs');
    const indexerCode = fs.readFileSync(require('path').join(__dirname, 'indexer.js'), 'utf8');
    await win.webContents.executeJavaScript(indexerCode);
    
    const js = `
      window.__opObserverRunning();
      Array.from(document.querySelectorAll('.op-text-label')).map(el => {
        const idMatch = el.innerText.match(/([A-Z]{3}_\\d{3})/);
        return idMatch ? idMatch[1] : null;
      }).filter(id => id).length;
    `;
    const count = await win.webContents.executeJavaScript(js);
    console.log("LABELS COUNT:", count);

    const dumpJS = `
      window.__op_elements = window.__opObserverRunning();
      window.__op_elements.filter(e => e.text && (e.text.toLowerCase().includes('iphone') || e.text.toLowerCase().includes('apple'))).map(e => ({id: e.id, text: e.text}));
    `;
    const res = await win.webContents.executeJavaScript(dumpJS);
    console.log("IPHONE ELEMENTS:\n", JSON.stringify(res, null, 2));
    app.quit();
  });
});
