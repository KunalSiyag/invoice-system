const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ip = require('ip');

const isDev = process.env.NODE_ENV === 'development';

const dataPath = path.join(app.getPath('userData'), 'jewellery_data');

if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath);
}

const getFilePath = (filename) => path.join(dataPath, filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

function setupCompanionServer() {
  const expressApp = express();
  expressApp.use(cors());

  // Setup multer for handling image uploads
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });

  expressApp.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upload Item Photo</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f3f4f6; }
          .container { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 90%; }
          .btn { background: #d4af37; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 6px; cursor: pointer; margin-top: 20px; width: 100%; font-weight: bold;}
          input[type="file"] { display: none; }
          .file-label { display: inline-block; background: #e5e7eb; color: #374151; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: calc(100% - 48px); margin-top: 10px; border: 1px dashed #9ca3af; }
          img { max-width: 100%; max-height: 200px; margin-top: 15px; border-radius: 8px; display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📷 Companion App</h2>
          <p>Take a picture to send it to the desktop.</p>
          <form id="uploadForm" enctype="multipart/form-data">
            <label class="file-label">
              Choose Photo or Open Camera
              <input type="file" name="photo" accept="image/*" capture="environment" id="photoInput" required>
            </label>
            <img id="preview" />
            <button type="submit" class="btn" id="submitBtn">Send to Desktop</button>
          </form>
          <p id="status" style="margin-top: 15px; color: green; font-weight: bold;"></p>
        </div>
        <script>
          const input = document.getElementById('photoInput');
          const preview = document.getElementById('preview');
          const form = document.getElementById('uploadForm');
          const status = document.getElementById('status');
          const submitBtn = document.getElementById('submitBtn');

          input.addEventListener('change', () => {
            if (input.files && input.files[0]) {
              const reader = new FileReader();
              reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
              }
              reader.readAsDataURL(input.files[0]);
            }
          });

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";
            const formData = new FormData(form);
            try {
              const response = await fetch('/upload', {
                method: 'POST',
                body: formData
              });
              if (response.ok) {
                status.textContent = "Success! Check the desktop app.";
                form.reset();
                preview.style.display = 'none';
              } else {
                status.textContent = "Failed to upload.";
                status.style.color = 'red';
              }
            } catch (err) {
              status.textContent = "Error connecting to desktop.";
              status.style.color = 'red';
            }
            submitBtn.disabled = false;
            submitBtn.textContent = "Send to Desktop";

            setTimeout(() => { status.textContent = ""; status.style.color = "green"; }, 3000);
          });
        </script>
      </body>
      </html>
    `);
  });

  expressApp.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    const base64Image = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // Send to React app
    if (mainWindow) {
      mainWindow.webContents.send('companion-photo-received', dataUrl);
    }
    res.status(200).send('Success');
  });

  const PORT = 3001;
  expressApp.listen(PORT, '0.0.0.0', () => {
    console.log(`Companion server running at http://0.0.0.0:${PORT}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  setupCompanionServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('read-file', async (event, filename) => {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
});

ipcMain.handle('write-file', async (event, filename, data) => {
  try {
    const filePath = getFilePath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
});

ipcMain.handle('get-local-ip', () => {
  return ip.address();
});

ipcMain.handle('send-sms', async (event, { to, body, credentials }) => {
  try {
    // In a real application, you would use a library like 'twilio'
    // const twilio = require('twilio');
    // const client = twilio(credentials.accountSid, credentials.authToken);
    // const message = await client.messages.create({ body, from: credentials.senderNumber, to });
    // return message.sid;

    console.log('Sending SMS...');
    console.log('To:', to);
    console.log('Body:', body);
    console.log('Credentials:', credentials);

    // Simulating API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate success
    return { success: true, messageId: 'mock-id-' + Date.now() };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
});
