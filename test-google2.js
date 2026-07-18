const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/search?q=best+cricket+tickets');
  win.webContents.on('did-finish-load', async () => {
    const js = `
      Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('Upcoming')).map(a => {
        const innerTxt = (a.innerText || '').trim().replace(/\\n/g,' ').replace(/\\s+/g,' ').substring(0, 80);
        return {
          originalLength: a.innerText.length,
          innerTxtLength: innerTxt.length,
          innerTxt: innerTxt
        };
      }).slice(0, 2)
    `;
    const res = await win.webContents.executeJavaScript(js);
    console.log("A TAGS LENGTHS:", JSON.stringify(res, null, 2));
    app.quit();
  });
});
