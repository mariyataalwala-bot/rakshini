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
      const allA = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('Upcoming Cricket Events'));
      allA.map(a => {
        const box = Array.from(document.querySelectorAll('.op-bounding-box')).find(b => {
          const rect = b.getBoundingClientRect();
          const aRect = a.getBoundingClientRect();
          return Math.abs(rect.top - aRect.top) < 10 && Math.abs(rect.width - aRect.width) < 10;
        });
        const label = Array.from(document.querySelectorAll('.op-text-label')).find(l => {
          const lRect = l.getBoundingClientRect();
          const aRect = a.getBoundingClientRect();
          return Math.abs((lRect.top + 20) - aRect.top) < 15;
        });
        return {
          text: a.innerText.substring(0, 50).replace(/\\n/g, ' '),
          hasBox: !!box,
          hasLabel: !!label,
          labelId: label ? label.innerText : null
        };
      });
    `;
    const res = await win.webContents.executeJavaScript(js);
    console.log("A TAG STATUS:\n", JSON.stringify(res, null, 2));
    app.quit();
  });
});
