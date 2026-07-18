const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/search?q=best+cricket+tickets');
  win.webContents.on('did-finish-load', async () => {
    const js = `
      Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('Cricket')).map(a => {
        const rect = a.getBoundingClientRect();
        return {
          text: a.innerText.substring(0, 50).replace(/\\n/g, ' '),
          rect: {width: rect.width, height: rect.height},
          hasChildren: a.children.length,
          display: window.getComputedStyle(a).display
        };
      }).slice(0, 5)
    `;
    const res = await win.webContents.executeJavaScript(js);
    console.log("A TAGS:", JSON.stringify(res, null, 2));
    app.quit();
  });
});
