const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/');
  win.webContents.on('did-finish-load', async () => {
    await win.webContents.executeJavaScript(`
      document.querySelector('textarea').value = 'cheapest iphone';
    `);
    const val = await win.webContents.executeJavaScript(`
      document.querySelector('textarea').value
    `);
    console.log("TEXTAREA VALUE:", val);
    app.quit();
  });
});
