const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readFile: (filename) => ipcRenderer.invoke('read-file', filename),
  writeFile: (filename, data) => ipcRenderer.invoke('write-file', filename, data),
  sendSms: (smsData) => ipcRenderer.invoke('send-sms', smsData),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  onPhotoReceived: (callback) => {
    // We attach the wrapper to the callback object to retrieve it later for removal
    const wrapper = (event, photoUrl) => callback(photoUrl);
    callback._wrapper = wrapper;
    ipcRenderer.on('companion-photo-received', wrapper);
  },
  offPhotoReceived: (callback) => {
    if (callback._wrapper) {
      ipcRenderer.removeListener('companion-photo-received', callback._wrapper);
      delete callback._wrapper;
    }
  }
});
