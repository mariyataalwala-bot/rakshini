const { app, BrowserWindow } = require('electron');
const fs = require('fs');

app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.amazon.com/');
  win.webContents.on('did-finish-load', async () => {
    try {
      const indexerCode = fs.readFileSync('indexer.js', 'utf8');
      const elements = await win.webContents.executeJavaScript(indexerCode);
      console.log(`Extracted ${elements.length} elements.`);
      const inputs = elements.filter(e => e.id.startsWith('INP'));
      console.log('Inputs:', inputs.map(i => ({ id: i.id, label: i.ariaLabel, placeholder: i.placeholder })));
      app.quit();
    } catch (e) {
      console.error(e);
      app.quit();
    }
  });
});
