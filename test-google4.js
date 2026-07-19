const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/search?q=best+cricket+tickets');
  win.webContents.on('did-finish-load', async () => {
    const js = `
      const allA = Array.from(document.querySelectorAll('a'));
      const cricketA = allA.filter(a => a.innerText.includes('Upcoming Cricket Events'));
      if (cricketA.length === 0) return "Not found";
      
      const target = cricketA[0];
      const targetRect = target.getBoundingClientRect();
      
      const allNodes = document.querySelectorAll('body *');
      const overlapping = Array.from(allNodes).filter(node => {
        if (node === target) return false;
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        
        let overlapX = Math.max(0, Math.min(targetRect.right, rect.right) - Math.max(targetRect.left, rect.left));
        let overlapY = Math.max(0, Math.min(targetRect.bottom, rect.bottom) - Math.max(targetRect.top, rect.top));
        let overlapArea = overlapX * overlapY;
        
        let targetArea = targetRect.width * targetRect.height;
        let nodeArea = rect.width * rect.height;
        
        return overlapArea > 0.8 * targetArea || overlapArea > 0.8 * nodeArea;
      }).map(node => {
        return {
           tag: node.tagName,
           className: node.className,
           jsaction: !!node.getAttribute('jsaction'),
           area: node.getBoundingClientRect().width * node.getBoundingClientRect().height,
           targetArea: targetRect.width * targetRect.height
        };
      });
      JSON.stringify(overlapping, null, 2);
    `;
    const res = await win.webContents.executeJavaScript(js);
    console.log("OVERLAPPING:\n", res);
    app.quit();
  });
});
