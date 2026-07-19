const { app, BrowserWindow } = require('electron');
app.on('ready', () => {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  win.loadURL('https://www.google.com/search?q=best+cricket+tickets');
  win.webContents.on('did-finish-load', async () => {
    const js = `
      function traceDiscard() {
        const allNodes = document.querySelectorAll('body *');
        let candidates = [];
        let theA = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Upcoming Cricket Events'));
        
        allNodes.forEach(node => {
          const rect = node.getBoundingClientRect();
          if (rect.width < 5 || rect.height < 5) return;
          const tag = node.tagName.toLowerCase();
          const role = node.getAttribute('role') || '';
          const isClickableTag = ['button', 'a', 'input', 'select', 'textarea'].includes(tag);
          const isTextTag = ['h1', 'h2', 'h3', 'p', 'span'].includes(tag);
          const isMedia = ['img', 'svg'].includes(tag);
          let prefix = 'ELM';
          let priority = 0;
          if (isClickableTag) { prefix = 'LNK'; priority = 4; }
          else if (isMedia) { prefix = 'IMG'; priority = 1; }
          else if (isTextTag) { prefix = 'TXT'; priority = 0; }
          else return;
          candidates.push({ node, rect, prefix, priority, area: rect.width * rect.height, shouldDiscard: false });
        });
        
        let logs = [];
        for (let i = 0; i < candidates.length; i++) {
          let c1 = candidates[i];
          let isSubset = false;
          for (let j = 0; j < candidates.length; j++) {
            if (i === j) continue;
            let c2 = candidates[j];
            let overlapX = Math.max(0, Math.min(c1.rect.right, c2.rect.right) - Math.max(c1.rect.left, c2.rect.left));
            let overlapY = Math.max(0, Math.min(c1.rect.bottom, c2.rect.bottom) - Math.max(c1.rect.top, c2.rect.top));
            let overlapArea = 0;
            if (overlapX > 0 && overlapY > 0) overlapArea = overlapX * overlapY;
            let c1SubsetOfC2 = overlapArea > 0.8 * c1.area;
            let c2SubsetOfC1 = overlapArea > 0.8 * c2.area;
            
            if (c1SubsetOfC2 && c2SubsetOfC1) {
               if (c2.priority > c1.priority) isSubset = true;
               else if (c2.priority === c1.priority && c2.area > c1.area) isSubset = true;
               else if (c2.priority === c1.priority && c2.area === c1.area && j < i) isSubset = true;
            } else if (c1SubsetOfC2) {
               if (c2.priority >= 2 && c1.priority === 0) isSubset = true;
               if (c2.priority === 0 && c1.priority === 0) isSubset = true;
               if (c1.priority >= 2 && c2.priority >= 1 && c2.priority <= c1.priority) {
                  c2.shouldDiscard = true;
                  if (c2.node === theA) logs.push(\`theA shouldDiscard=true because of \${c1.node.tagName}(\${c1.priority}) area \${c1.area} inside theA area \${c2.area}\`);
               }
            }
          }
          if (c1.node === theA && isSubset) logs.push('theA isSubset=true');
        }
        return logs;
      }
      traceDiscard();
    `;
    const res = await win.webContents.executeJavaScript(js);
    console.log("TRACE LOGS:\n", JSON.stringify(res, null, 2));
    app.quit();
  });
});
