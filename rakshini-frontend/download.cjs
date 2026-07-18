const https = require('https');
const fs = require('fs');
const path = require('path');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download, status code: ${response.statusCode}`));
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  try {
    console.log('Downloading luggage image...');
    await download(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Luggage_at_airport.jpg/640px-Luggage_at_airport.jpg',
      path.join(__dirname, 'public', 'cam3.jpg')
    );
    console.log('Successfully downloaded luggage image to cam3.jpg');

    console.log('Downloading street market image...');
    await download(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Street_market.jpg/640px-Street_market.jpg',
      path.join(__dirname, 'public', 'cam4.jpg')
    );
    console.log('Successfully downloaded street market image to cam4.jpg');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
