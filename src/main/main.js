// Modules to control application life and create native browser window
const { app, BrowserWindow, screen, ipcMain, dialog, webContents } = require('electron');
const os = require('os'); // used to get local IP addresses
const path = require('path');
const process = require('process'); // used to obtain uptime for application
const sqlite3 = require('better-sqlite3'); // used for database access
const express = require('express');
const AppServer = express();
const router = express.Router();
const fs = require('fs');  // used for all file i/o
const { exec } = require('child_process');
const { execFile } = require('child_process');   
const { ExifTool } = require('exiftool-vendored');  //the curly brackets { ExifTool } destructures the ExifTool property from the module's exports, so you can use it directly in your code
const exiftool = new ExifTool();

const devtools = true; // enables dev tool windows

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow=null;  //index.html
let ImageWindow = null;  //dipslay.html
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

const DB = require(path.join(__dirname, '..', 'common', 'DBFunctions.js'));  // load DBFunctions.js
DB.initDBFunctions({
  dbInstance: db,
  electron: { app, BrowserWindow, screen, ipcMain, dialog, webContents,  getPopup: () => Popup }
});


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

let ipc_index =[];
let ipc_main = ["app_readDB","app_writeDB","refresh","ImageDir","DeletePlaylist","NewPlaylist","WriteMetaData","readNotifications","clearNotifications","rebuildDatabase","readQRCode"];
let ipc_display = ["information","readMetaData","information","direction","filectrl","volume","GetMutePlay","ZoomImage"];
const arrayMap = {
  ipc_index,
  ipc_main,
  ipc_display
};

// Handles POST requests from the client.
router.post('/app_sendrequest', async (req, res) => {    
  // Extract the unique request_id from the payload.
  const { request_id, ...payloadWithoutId } = req.body;  
  
  // Store the response object (res) using the request_id as the key.
  if (request_id) {
      activeRequests.set(request_id, res);
  } else {
      // Handle case where request_id is missing, e.g., send an error response.
      return res.status(400).json({ error: 'Missing request_id' });
  }

  const foundIn = Object.keys(arrayMap).find(key => arrayMap[key].includes(req.body.command));
  switch(foundIn){
    case "ipc_main":
      ipc_mainPOST(req.body);
    break;
    case "ipc_display":      
      ipc_displayPOST(req.body);         
    break;
  }
});

function ipc_displayPOST(payload) {    
  win = ImageWindow;
  channel = "ipc_display";
  let response = {command: payload.command, data: null}; // Default response structure  
  request_id = payload.request_id;  
  // for cases when the call does not come from PrepMessage per the app, need to add a request_id
  if (request_id == null || request_id == undefined){ 
    request_id = Date.now().toString() + Math.random().toString(36).substring(2);
  }

  if (!win || win.isDestroyed() || !win.webContents){
    ipcMain.emit('app_sendrequest_response', null, { request_id, responseData: response });
    return;
  }
  
  return new Promise((resolve, reject) => {
    
    // Listen for one reply only (auto-cleanup)
    ipcMain.once(`${channel}-reply-${request_id}`, (event, response) => {
  
      // resolve the response
      resolve(response);
      // Emit after promise has resolved (next tick)
      process.nextTick(() => {
        ipcMain.emit('app_sendrequest_response', null, { request_id, responseData: response });
      });
    });

    // Send the message with requestId and data
    win.webContents.send(channel, payload);

  });
}

function ipc_indexPOST(payload) {  
  win = mainWindow;
  channel = "ipc_index";  
  let request_id = Date.now().toString() + Math.random().toString(36).substring(2);
  let response = {command: payload.command, data: null}; // Default response structure    

  if (!win || win.isDestroyed() || !win.webContents){
    return response;
  }

  payload.request_id = request_id; // add request_id to response object
  
  return new Promise((resolve, reject) => {
    // Listen for one reply only (auto-cleanup)
    ipcMain.once(`${channel}-reply-${request_id}`, (event, response) => {        
      resolve(response);// resolve the response
    });

    // Send the message with requestId and data
    win.webContents.send(channel, payload);

  });
}

async function ipc_mainPOST (payload){
    // 1. Destructure the request_id from the incoming data object.
  const { request_id, ...payloadWithoutId } = payload;

  // Use the payload without the ID for processing.
  const command = payloadWithoutId.command;
  const requestData = payloadWithoutId.data;  
  
  let response = {command: command, data: null}; // Default response structure  

  switch (command){
    case "app_readDB":
      let GlobalSettings = DB.readDataBase(); 
      response.data = GlobalSettings;      
    break;
    case "app_writeDB":
      DB.appWriteDB(requestData);
      resetDisplay();
    break;
    case "refresh":
      resetDisplay();
    break;
    case "ImageDir":
      response = await getStartDir(requestData);      
    break;
    case "DeletePlaylist":
      DeletePlaylist(requestData);
    break;
    case "NewPlaylist":
      response.data = await NewPlaylist(requestData);
    break;
    case "WriteMetaData":
      WriteMetaData (requestData);
    break;
    case "readNotifications":
      response.data = DB.readRotateDeleteError();      
    break;
    case "clearNotifications":
      DB.ClearRotateDelete();
    break;
    case "rebuildDatabase":    
      response.data = await DB.rebuildall(); // from dbfunctions.js         
    break;
    case "readQRCode":
      response.data = getLocalIPs();
    break;
  }  
  
  ipcMain.emit ('app_sendrequest_response', null, {request_id: request_id, responseData: response});
}

ipcMain.handle('ipcMain_invoke', async (event, payload) => {
  command = payload.command;
  payloadData = payload.data;
  response = {command: command, data: null};
  switch (command){
    case 'get-local-ips':
      response.data = getLocalIPs(); // returns the IPs to the renderer
    break;
    case 'resetdisplaywindow':
      await resetDisplay();
    break;
    case 'playlist_dir_dialog':
      returnvalue = await dialog.showOpenDialog({properties: ['openFile', 'openDirectory']});   
      response.data = returnvalue.filePaths  
    break;
    case 'OpenPopup':
      ipcMain.emit('popup', 'index.html', payloadData);
    break;
    case 'ClosePopup':
      if (Popup){
        Popup.close(); // fires Popup.on('closed', function ()... which sets ImageWindow to null          
      }
    break;
    case 'playlist_updated':    
      let payload = {command: 'action-update', data: null}
      ipc_indexPOST(payload);      
    break;
    case 'close_image_window':
      if (ImageWindow)  {
        await ImageWindow.close();  // fires ImageWindow.on('closed', function ()... which sets ImageWindow to null
      }
    break;
    case 'GetPicFrameUptime':
      // determine uptime for picture frame application and return        
      response.data = await getPicFrameUptime();
      /*
      if (ImageWindow){
        ImageWindow.webContents.send('PicFrameUptime', picframeuptime);
      } 
        */     
    break;
  }
  return response;

});



ipcMain.on('app_sendrequest_response', (event, arg) => { // event is not needed once all is re-written
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

async function WriteMetaData(data){
  existingHiddenFlag = "";
  if (data.dbEXIFHiddenImages == true){      
    existingHiddenFlag = 'Hiddenflag=Hidden ';
  }

  const existingComment = data.dbEXIFImageComments ? data.dbEXIFImageComments.trim() : "";
  const updatedComment = existingHiddenFlag + existingComment;   

  // Check if extension is jpg or jpeg before writing EXIF
  const ext = data.ImagePath.split('.').pop().toLowerCase();
  try{
    if (ext === 'jpg' || ext === 'jpeg') {
      await exiftool.write(data.ImagePath, { UserComment: updatedComment }, ["-overwrite_original"]);
    } else {                        
      await addCommentToMP4(data.ImagePath, updatedComment);              
    }
    ipc_displayPOST({ command: 'updateLoadedItemMetaData', data: data }); // refresh metadata in display window
  } catch (error){
    DB.writeRotateDeleteError(null, null, 'Error writing EXIF data:', error);      
  }
}


async function addCommentToMP4(filePath, commentString) {    
  return new Promise((resolve, reject) => {
      const tempFilePath = filePath.replace(/\.mp4$/, '_temp.mp4');
      const args = [
        '-i', filePath,
        '-metadata', `comment=${commentString}`,
        '-c', 'copy',
        tempFilePath
      ];
      const ffmpegPath = path.join(__dirname, '..', 'renderer', 'assets', 'ffmpeg', 'ffmpeg.exe');
      const ffmpegProcess = execFile(ffmpegPath, args, (error, stdout, stderr) => {
        if (error) {            
          cleanupTempFile(tempFilePath); // Ensure temp file is cleaned up   
          DB.writeRotateDeleteError(null, null, `Failed to add comment to MP4: ${stderr}`);         
          reject();
          return;
        }
      });

      // Wait for the ffmpeg process to fully close
    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {          
        DB.writeRotateDeleteError(null, null, `FFmpeg process exited with code ${code}`);
        cleanupTempFile(tempFilePath); // Ensure temp file is cleaned up
        reject();
        return;
      }

        // Proceed with file operations after ffmpeg has completed
      fs.unlink(filePath, (unlinkError) => {
        if (unlinkError) {
          DB.writeRotateDeleteError(null, null, 'Error deleting original file:', unlinkError, 'cannot replace file');            
          // Cleanup the temp file and resolve without deleting filePath
          cleanupTempFile(tempFilePath);
          reject();
          return;
        }

        fs.rename(tempFilePath, filePath, (renameError) => {
          if (renameError) {
            DB.writeRotateDeleteError(null, null, 'Error replacing original file:', renameError);              
            cleanupTempFile(tempFilePath); // Ensure temp file is cleaned up
            reject();
            return;
          }                                
          resolve();
        });
      });
    });
  });
}

function cleanupTempFile(tempFilePath) {
  fs.unlink(tempFilePath, (err) => {
    if (err) {
      errormsg = `Failed to clean up temp file (${tempFilePath}):`, err.message
      DB.writeRotateDeleteError(null, null, errormsg); // located in DBFunctions.js
      
    }
  });
}

async function NewPlaylist(data){
  let PlaylistCreated = false;
  playlistdirs = data.playlistDir;
  new_name = data.playlistname;

  ipcMain.emit('popup','main.js','Building Index'); 
  try{
    PlaylistCreated = await DB.CreateAddPlaylistTable(new_name,playlistdirs, true);                                         
  }catch (err){
    //DB.writeRotateDeleteError(null, null, 'Error creating playlist table: '+ new_name + ' ' + err.message);   
    PlaylistCreated = false;   
  }    
  let payload = {command: 'action-update', data: null};
  ipc_indexPOST(payload);

  if (Popup){
    Popup.close(); // fires Popup.on('closed', function ()... which sets ImageWindow to null          
  }
  return PlaylistCreated;
}

function DeletePlaylist(data){        
  db.prepare('DROP TABLE IF EXISTS '+ data).run(); // drop selected playlist table
  let GlobalSettings = DB.readDataBase(); 
  let tablenamearray = GlobalSettings.playlists
  //var tablenamearray = DB.readPlaylistTableNames();
  playlistHolder = GlobalSettings.selPLAYLIST;
  g_selPLAYLIST = 'playlist_'+ tablenamearray[0];    
  DB.writeDataBase();
  
  //ipcMain.emit('playlist_updated', null);  
  let payload = {command: 'action-update', data: null};
  ipc_indexPOST(payload); 
  // if the running playlist is the deleted playlist, reset display with next playlist in the database table    
  if (data == playlistHolder){      
    ressetdisplaywindow(); 
  }
}


async function getStartDir(SelectedDir) { 
  var results = [];   
  let GlobalSettings = DB.readDataBase();// read playlist data and paths into DBFunctions.js        
  if (SelectedDir == 'TopDir') {                 
    if (GlobalSettings.appStartDir.charAt(0) =='\\'){  // just in cased a server path is chosen eg. \\diskstation\photo then dont add escape code \
      results.push(GlobalSettings.appStartDir);  
      SelectedDir = GlobalSettings.appStartDir;            
    }else{
      results.push(GlobalSettings.appStartDir);  
      SelectedDir = GlobalSettings.appStartDir.replace(/\\/g, '\\\\');            
    }                  
  }else{
    results.push(SelectedDir);  
  }
  returndata = {command: "startdir", data:null}; // dummy object to populate for return    
  try{
    await fs.readdirSync(SelectedDir).sort().forEach(function (dirContent) {              
      dirContentPath = path.resolve(SelectedDir, dirContent);
      try{  // added try:catch here as statSync throse a EBUSY error if a locked file or directory is tested
        if (fs.statSync(dirContentPath).isDirectory() && dirContent.charAt(0) != '#' && dirContent.charAt(0) != '.' && dirContent.charAt(0) !='$') {
            results.push(dirContentPath);
        }
      }catch (err){
        
      }
    });
    returndata.data = results        
  }catch (err){
    returndata.data = 'bad dir';        
  }      
  return returndata;
}


var resetDisplayWindow = false; // used to determine if display window should be reset Handling 'resetdisplaywindow' event
async function resetDisplay(){    
  if (ImageWindow) {
    resetDisplayWindow = true; // set flag to true so we know to reset display window
    await ImageWindow.close();    
    ipcMain.emit('startshow', '');         
  }else{    
    ipcMain.emit('startshow', '');
  }
};

async function getPicFrameUptime(){
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





function getLocalIPs() {
  const nets = os.networkInterfaces();
  const results = { ipv4: [], ipv6: [] };
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) results.ipv4.push(net.address);
      if (net.family === 'IPv6' && !net.internal) results.ipv6.push(net.address);
    }
  }
  return results;
}


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
  mainWindow.on('closed', async function () { 
    if (Popup) {
      Popup.close();
    }
    if (ImageWindow)  {
      await ImageWindow.close();  // fires ImageWindow.on('closed', function ()... which sets ImageWindow to null
    }  
    mainWindow = null;
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
    ipc_displayPOST({ command: 'volume', data: 0}); //set volume to 0 on start
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
        resetDisplay(); // display.html is hung so reset it
      }, 120000); //give it 2 min to respond.   120000 = 2 minutes      

    } else {            
     // DB.writeRotateDeleteError(null, null, 'No webcontents or imagewindow = null main.js resetting ' + new Date()); // write reset to database      
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


ipcMain.on('popup', async (event, arg) => {  

  let popupCaller = mainWindow; 

  switch (event){
    case 'index.html':
      popupCaller = mainWindow;
    break;
    case 'display.html':
    case 'main.js':
      if (ImageWindow){ 
        popupCaller = ImageWindow;
      }else{
        popupCaller = mainWindow;
      }
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

  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    if (app.isPackaged){ // only run if app is packaged, not in dev environment
      if (mainWindow) {  
        mainWindow.setSize(500, 425);      //({center: true, width: 1000, height: 600, maximizable: true, resizable: true, icon: './res/icon.png', webPreferences: {
      }    
    }
  });
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {  
  //db.close();
  db.close();  
  exiftool.end;
  app.quit();  
})

