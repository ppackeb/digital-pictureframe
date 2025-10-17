// Modules to control application life and create native browser window
const { app, BrowserWindow, screen, ipcMain, dialog, webContents } = require('electron');
const os = require('os'); // used to get local IP addresses
const path = require('path');
const process = require('process'); // used to obtain uptime for application
const sqlite3 = require('better-sqlite3'); // used for database access
const express = require('express');
const AppServer = express();
const router = express.Router();

const devtools = true; // enables dev tool windows

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow=null;  //index.html
let ImageWindow = null;  //dipslay.html
let appserverWindow = null; //appServer.html
let PlaylistConfigWindow = null; //playlist.html
let Popup = null; //popup.html
let res_app_sendrequest = null;  //hold req for call from appServer.html for a return value
let db = null; // database connection



/*-----------------------------------*/
/* Server and Appserver specific code */

// setup express server for AppServer.html calls
AppServer.use(require('body-parser').json()); // used by express to read HTTP POST data from req
AppServer.use('/', router); // tells express server to use the router for all requests strating with root URL '/'
AppServer.use(express.static(path.dirname(__dirname))); // everything under src
AppServer.use(express.static(path.join(path.dirname(path.dirname(__dirname)), 'db')));
AppServer.use(express.static(path.join(path.dirname(path.dirname(__dirname)), 'node_modules'))); // share everything under node_modules
AppServer.use(express.static(path.join(path.dirname(__dirname),'renderer','assets','images'))); // share everything under webApp
AppServer.use(express.static(path.join(path.dirname(__dirname),'renderer','webApp'))); // share everything under webApp


// test if app is built or in dev environment then set the process.env.NODE_ENV for reading
//  from correct DB for appserver port
if (app.isPackaged) {  
  process.env.NODE_ENV = 'production';  
  db = new sqlite3(path.join(process.resourcesPath, "app.asar.unpacked/db/PlaylistDB.db"));  
  AppServer.listen(parseInt(db.prepare('SELECT Value FROM global_settings WHERE Setting = ?').get('appPort').Value));  
  
} else {
  process.env.NODE_ENV = 'development';
  db = new sqlite3('./db/PlaylistDB.db');
  AppServer.listen(parseInt(db.prepare('SELECT Value FROM global_settings WHERE Setting = ?').get('appPort').Value));    
}



//(/:page?) captures all requests to the server not just the html pages (e.g., /app%20zoom.png) but any request to the server.
//So the switch runs through each request, if it is not a page to load if just call the 'next' callback calls next request in queue.
router.get('/:page?', (req, res, next) => {
  const { page } = req.params;
  let filePath;  
  switch (page) {
    case undefined: // For root path "/"
      filePath = '../renderer/webApp/appMain.html';
    break;
    case 'appItemMetaData':
      filePath = '../renderer/webApp/appItemMetadata.html';
    break;
    case 'appZoom':
      filePath = '../renderer/webApp/appZoom.html';
    break;
    case 'appOptions':
      filePath = '../renderer/webApp/appOptions.html';
    break;
    case 'appNotifications':
      filePath = '../renderer/webApp/appNotifications.html';
    break;
    case 'appPlaylistSettings':
      filePath = '../renderer/webApp/appPlaylistSettings.html';
    break;
    case 'appPlaylists':
      filePath = '../renderer/webApp/appPlaylists.html';
    break;
    case 'appEditPlaylist':
      filePath = '../renderer/webApp/appEditPlaylist.html';
    break;
    case 'appCurrentPlaylist':
      filePath = '../renderer/webApp/appCurrentPlaylist.html';
    break;   
    case 'appQRCode':
      filePath = '../renderer/webApp/appQRCode.html';
    break;   
    default:    
      return next();       // Pass control to the next middleware (e.g., static file serving)
  }
  res.sendFile(path.join(__dirname, filePath));
})

// A map to store active response objects, keyed by a unique request ID.
// This prevents multiple concurrent requests from overwriting each other.
const activeRequests = new Map();

// --- Existing Express setup code...
// ... (your existing Express setup)
// AppServer.use(require('body-parser').json());
// ...
// ---

// Handles POST requests from the client.
router.post('/app_sendrequest', (req, res) => {
    // Extract the unique request_id from the payload.
    const { request_id, ...payloadWithoutId } = req.body;
    
    // Store the response object (res) using the request_id as the key.
    if (request_id) {
        activeRequests.set(request_id, res);
    } else {
        // Handle case where request_id is missing, e.g., send an error response.
        return res.status(400).json({ error: 'Missing request_id' });
    }

    // Now, send the payload to the appserverWindow, including the request_id.
    // The appserverWindow will use this ID to send the response back.
    appserverWindow.webContents.send('appSendRequest', {
        ...payloadWithoutId,
        request_id: request_id
    });
});

// Responds to the client with the data from the appserverWindow.
// This IPC message is triggered from the appServer.html renderer process.
ipcMain.on('app_sendrequest_response', (event, arg) => {
    // We expect the argument to be an object with a request_id and the response data.
    const { request_id, responseData } = arg;
    
    // Retrieve the correct response object using the request_id.
    const res = activeRequests.get(request_id);

    if (res) {
        // Send the response back to the original client.
        res.json(responseData);
        // Clean up: remove the response object from the map to free up memory.
        activeRequests.delete(request_id);
    } else {
        // Log an error if the request ID isn't found (shouldn't happen with this setup).
        console.error('Response object not found for request_id:', request_id);
    }
});


/*-----------------------------------*/
// IPC communication between main.js and html files


//.invoke/.handle is used for request-response pattern
//.send/.on is used for fire-and-forget or one-way messages

// passing from appserver.html to main.js in order to get ImageWindow handle to know if imagewindow is open
ipcMain.on('pass_appInfo', (event, arg) => {    
  if (ImageWindow){    
    ImageWindow.webContents.send('appInfo', arg);             
  }
})


ipcMain.handle('GetMutePlay', async (event, arg) => {
  if (!ImageWindow) return null;  
  ImageWindow.webContents.send('GetMutePlay', null);// Send request to ImageWindow
  // Wait for ImageWindow to respond
  const response = await new Promise((resolve) => {
    ipcMain.once('GetMutePlayResponse', (event, response) => {
      resolve(response);
    });
  });
  return response; // This goes back to ipcRenderer.invoke
})


ipcMain.handle('AppGetCurrentDisplayImageData', async (event, arg) => {  
  if (!ImageWindow) return null; 
  
    ImageWindow.webContents.send('AppGetCurrentDisplayImageData', arg);
    const response = await new Promise((resolve) => {
    ipcMain.once('AppGetCurrentDisplayImageDataResponse', (event, response) => {      
      resolve(response);
    });
  });
  return response; // This goes back to ipcRenderer.invoke
})

// zoom info for display.html
ipcMain.on('appZoomLocation', (event, arg) => {
  if (ImageWindow){  
    ImageWindow.webContents.send('ZoomLocation', arg);  
  };
})

ipcMain.on('dbrebuildfailed', (event,arg)=>{
  if (ImageWindow){
    ImageWindow.webContents.send('dbrebuildfailure', arg);  
  };
})

ipcMain.on('playlist_updated', (event, arg) => {
  // Request to update the label in the renderer process of the second window
  mainWindow.webContents.send('action-update', arg);
})

ipcMain.on('playlist_dir_dialog', async (event, arg) => {
  var myresults = await dialog.showOpenDialog({properties: ['openFile', 'openDirectory']});   
  event.returnValue =  myresults.filePaths;  
})

ipcMain.on('hidden_files_dialog', async (event, arg) => {
  //var myresults = await dialog.showOpenDialog({properties: ['openFile', 'openDirectory']});   
  var myresults = await dialog.showOpenDialog({
    title: 'Select Image Files',
    buttonLabel: 'Select',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg'] }
    ]    
  });
  event.returnValue = myresults.filePaths;
})

var resetDisplayWindow = false; // used to determine if display window should be reset
// Handling 'resetdisplaywindow' event
ipcMain.on('resetdisplaywindow', async (event, arg) => {
  mainWindow.webContents.send('resetImageWindow', null);   //update UI in index.html and write to DB 
  if (ImageWindow) {
    resetDisplayWindow = true; // set flag to true so we know to reset display window
    await ImageWindow.close();    
    ipcMain.emit('startshow', '');         
  }else{    
    ipcMain.emit('startshow', '');
  }
});


ipcMain.on('close_image_window', async (event, arg) => {
  if (ImageWindow)  {
    await ImageWindow.close();  // fires ImageWindow.on('closed', function ()... which sets ImageWindow to null
  }
})



ipcMain.on('close_popup', (event, arg) => {
  if (Popup){
    Popup.close(); // fires Popup.on('closed', function ()... which sets ImageWindow to null
     // Send acknowledgment back to the renderer process
    event.sender.send('close_popup_ack');
  }else{
    event.sender.send('close_popup_ack');
  }  
})

ipcMain.on('close_playlist_window', (event, arg) => {
  if (PlaylistConfigWindow){
    PlaylistConfigWindow.close(); // fires PlaylistConfigWindow.on('closed', function ()... which sets ImageWindow to null
  }
})



// determine uptime for picture frame application and return  
ipcMain.on('Get_PicFrameUptime', (event, arg) => {
  let picframeuptime = getPicFrameUptime();
  if (ImageWindow){
    ImageWindow.webContents.send('PicFrameUptime', picframeuptime);
  }
})

function getPicFrameUptime(){
  let uptime = process.uptime();  

  // calculate days hour min seconds
  let ut_days = uptime/86400;
  let rem_secs = uptime % 86400;
  let ut_hours = rem_secs /3600;
  rem_secs = rem_secs % 3600;
  let ut_mins = rem_secs /60;
  let ut_secs = rem_secs % 60;

  // remove trailing decimals
  ut_secs = Math.floor(ut_secs);
  ut_mins = Math.floor(ut_mins);
  ut_hours = Math.floor(ut_hours);
  ut_days = Math.floor(ut_days);

  let picframeuptime = {
    ut_days: ut_days,
    ut_hours: ut_hours,
    ut_mins: ut_mins,
    ut_secs: ut_secs,    
  };
  return picframeuptime;
}

// use electron to get local IP addresses
ipcMain.handle('get-local-ips', () => {
  const nets = os.networkInterfaces();
  const results = { ipv4: [], ipv6: [] };
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.ipv4.push(net.address);
      }
      if (net.family === 'IPv6' && !net.internal) {
        results.ipv6.push(net.address);
      }
    }
  }
  return results;
});

/*-----------------------------------*/
// load html page functions

// Create the main application window index.html
const DESIRED_CONTENT = { width: 630, height: 620 };
function createWindow () {
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);


  if (devtools){
    mainWindow = new BrowserWindow({center: true, width: 1000, height: 800, maximizable: true, resizable: true, icon: './res/icon.png', webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Ensure Node.js integration       
    }});
    mainWindow.webContents.openDevTools();    
  }else{
    mainWindow = new BrowserWindow({
      width: DESIRED_CONTENT.width,
      height: DESIRED_CONTENT.height,
      useContentSize: true,   // IMPORTANT: width/height are the content area
      resizable: false,       // keep non-resizable as you want
      maximizable: false,
      minimizable: false,
      show: false,            // create hidden until we fix size
      center: true,
      icon: './res/icon.png',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });  
  }
    
  //var homedir = __dirname + "\\src\\renderer\\index.html";
  var homedir = path.join(path.dirname(__dirname), "renderer", "index.html");
  mainWindow.loadFile(homedir);

  mainWindow.once('ready-to-show', () => {
    // setContentSize sets the inside web page size (in CSS/logical pixels)
    mainWindow.setContentSize(DESIRED_CONTENT.width, DESIRED_CONTENT.height);

    // center/show after fixing size
    mainWindow.center();
    mainWindow.show();
  });

    // handle display changes (like resolution or DPI scaling changes)
  screen.on('display-metrics-changed', (event, changedDisplay, changedMetrics) => {
    // Only react if the display where the window is changed (or if scale changed)
    const winBounds = mainWindow.getBounds();
    const nearest = screen.getDisplayNearestPoint({ x: winBounds.x, y: winBounds.y });
    if (nearest.id === changedDisplay.id && changedMetrics.includes('scaleFactor')) {
      // reapply content size to keep it consistent
      mainWindow.setContentSize(DESIRED_CONTENT.width, DESIRED_CONTENT.height);
      mainWindow.center();
    }
  });
    
  // Emitted when the window is closed.
  mainWindow.on('closed', function () { 
    if (Popup) {
      Popup.close();
    }
    ipcMain.emit('close_image_window');
    appserverWindow.close(); // close appserver window when main window is closed
    mainWindow = null;
  });
}

// called by main.js when the index.html window is created in createWindow()
function appStartServer(){
  if (devtools){    
    appserverWindow = new BrowserWindow({center: true, width: 1000, height: 800, maximizable: true, resizable: true, icon: './res/icon.png', webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Ensure Node.js integration       
    }});
    appserverWindow.webContents.openDevTools();              
  }else{          
    appserverWindow = new BrowserWindow({center: true, width: 10, height: 10, hide: true, maximizable: false, resizable: false, icon: './res/icon.png', webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Ensure Node.js integration       
    }});

    appserverWindow.hide();
  }
  // create appserver window and then hide
  //var homedir = __dirname + "\\src\\renderer\\webApp\\appServer.html";
  var homedir = path.join(path.dirname(__dirname), "renderer", "webApp", "appServer.html");
  appserverWindow.loadFile(homedir);  

  appserverWindow.on('closed', function () {
    appserverWindow = null;
  });
}

ipcMain.on('startshow', async (event, arg) => {  
  if (devtools){
    ImageWindow = new BrowserWindow({width: 1000, height: 800, webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Ensure Node.js integration       
    }});    
    ImageWindow.webContents.openDevTools();
  }else{
    ImageWindow = new BrowserWindow({ fullscreen: true, webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Ensure Node.js integration       
    }});    
  }
  //var homedir = __dirname + "\\src\\renderer\\display.html";  
  var homedir = path.join(path.dirname(__dirname), "renderer", "display.html");
  ImageWindow.loadFile(homedir); 

 
  ImageWindow.webContents.on('did-stop-loading', () => {     
    ImageWindow.webContents.send('pageloadcheck', 'page loaded');     
    ipcMain.emit('pass_appInfo', null, { command: 'volume', data: 0 }); // set volume to 0 when display.html is loaded
  });
    if (!devtools){
      mainWindow.minimize(); // minimize main window when imagewindow is opened    
    }
  
  let WatchdogResponseTimeout;
  let WatchdogTimeout;
  // setup watchdog timer to check if display.html is hung
   WatchdogTimeout = setInterval(() => {        
    if (ImageWindow && ImageWindow.webContents) {      
      ipcMain.removeAllListeners('displayWatchdogResponse');
      ipcMain.once('displayWatchdogResponse', (event, response) => {             
        clearTimeout(WatchdogResponseTimeout);  // clear the timeout as we got a response
      });

      ImageWindow.webContents.send('displayWatchdogRequest', null); // send watchdog request to display.html             
    
      // timeout to wait for response from display.html.  If no response in 10 seconds display.html is hung so restart
      WatchdogResponseTimeout = setTimeout(() => {         
        //writeRotateDeleteError(null, null, 'No response from display.html resetting ' + new Date()); // write reset to database
        ipcMain.emit('resetdisplaywindow', ''); // display.html is hung so reset it
      }, 120000); //give it 2 min to respond.   120000 = 2 minutes      

    } else {            
     // writeRotateDeleteError(null, null, 'No webcontents or imagewindow = null main.js resetting ' + new Date()); // write reset to database      
    }

  }, 300000); // run every 5 minutes 300000 = 5 minutes

  
  const thisWindow = ImageWindow;  // store the current ImageWindow reference to check if it is closed later
  ImageWindow.on('closed', async function () {
    ipcMain.removeAllListeners('displayWatchdogResponse'); // remove all listeners for displayWatchdogResponse
    clearTimeout(WatchdogResponseTimeout);
    clearInterval(WatchdogTimeout);
    if (ImageWindow === thisWindow) {      
      ImageWindow = null;
    }
    if (!devtools && resetDisplayWindow === false) {
      mainWindow.restore();      
      mainWindow.setSize(645, 650);
      mainWindow.center();
      mainWindow.webContents.reload();      
    } else if (resetDisplayWindow === true) {
      resetDisplayWindow = false;
    }   
  });
})

// this is also in DBfuntions.js can I just load that?
// pass in null for Rotate, Delete, Reset not used for the specific writing
function writeRotateDeleteError(Rotate, Delete, Error){
  const query = `INSERT INTO rotate_delete (rotate, remove, error) VALUES (?, ?, ?)`;
  const stmt = db.prepare(query);
  //const stmt = db.prepare(query);
  stmt.run(Rotate, Delete, Error);
}


ipcMain.on('popup', async (event, arg) => {  

  let popupCaller = null;
  const fullUrl = event.sender.getURL();// Full file URL
  const filePath = new URL(fullUrl).pathname;// Convert file:// URL to a proper filesystem path

  // Handle Windows leading slash issue
  const normalizedPath = process.platform === 'win32' && filePath.startsWith('/')
    ? filePath.slice(1)
    : filePath;

  // Just the filename (e.g. index.html)
  const filename = path.basename(normalizedPath);

  switch (filename){
    case 'index.html':
      popupCaller = mainWindow;
    break;
    case 'display.html':
      popupCaller = ImageWindow;
    break;
    case 'appServer.html':
      popupCaller = ImageWindow;
    break;
  }  

    if (devtools){
      Popup = new BrowserWindow({width: 200, height: 200, frame: false,  parent: popupCaller, modal: true,  webPreferences: {
        nodeIntegration: true,
        contextIsolation: false // Ensure Node.js integration       
      } });
      Popup.webContents.openDevTools();
    }else{
      Popup = new BrowserWindow({width: 200, height: 150, frame: false, resizable: false, parent: popupCaller, modal: true, webPreferences: {
        nodeIntegration: true,
        contextIsolation: false // Ensure Node.js integration       
      }});
    }
    //var homedir = __dirname + "\\src\\renderer\\popup.html";
    var homedir = path.join(path.dirname(__dirname), "renderer", "popup.html");    
    Popup.loadFile(homedir);

    Popup.webContents.on('did-stop-loading', () => {
      Popup.webContents.send('pageloadcheck', 'page loaded');
      Popup.webContents.send('popup-title', arg);
    });
    
  const thisPopup = Popup;  // store the current ImageWindow reference to check if it is closed later
  Popup.on('closed', function () {
    if (Popup === thisPopup) {      
      Popup = null;
    }    
  });
})


ipcMain.on('playlist_config', (event, arg) => {
  if (devtools){
    PlaylistConfigWindow = new BrowserWindow({width: 1000, height: 800, webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Ensure Node.js integration       
    }});
    PlaylistConfigWindow.webContents.openDevTools();
  }else{
    PlaylistConfigWindow = new BrowserWindow({parent: mainWindow, modal: true, width: 500, height: 510, frame: false, resizable: false , webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Ensure Node.js integration       
    }});    
  }
  var homedir = __dirname + "\\playlist.html";
  PlaylistConfigWindow.loadFile(homedir);

  PlaylistConfigWindow.webContents.on('did-stop-loading', () => {
    PlaylistConfigWindow.webContents.send('pageloadcheck', 'page loaded');
  });

  PlaylistConfigWindow.on('closed', function () {
    PlaylistConfigWindow = null;
  });
})


/*-----------------------------------*/
//App specific settings and configuration

// required to enable autoplay of video with sounds
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required")

// removes menu bar perminantly from mainWindow (index.html)
app.on('browser-window-created',function(e,mainWindow) {
  mainWindow.setMenu(null);
})


//reset mainwindow (index.html) if the TV turns off and on and the window sizes full screen
app.on('ready', () => {
  createWindow();  // creates the main window index.html
  appStartServer(); // creates the appserver window appServer.html

  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    if (app.isPackaged){ // only run if app is packaged, not in dev environment
      if (mainWindow) {  
        mainWindow.setSize(500, 425);      //({center: true, width: 1000, height: 600, maximizable: true, resizable: true, icon: './res/icon.png', webPreferences: {
      }
      if (appserverWindow){
        appserverWindow.setSize(10,10);
        appserverWindow.hide();
      }    
    }
  });
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {  
  //db.close();
  db.close();  
  app.quit();  
})




