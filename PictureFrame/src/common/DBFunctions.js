/*
global playlist data
runtime variable is used for enableing debug.  It is disabled (set to 1) in the distributed playlistDB file
db is coming from requireModule.js where it is defined and set
*/


var g_playlists;
var g_prefetchNUM;
var g_selPLAYLIST;
var g_preloadNUM;
var g_basedelay;
var g_nightlyrebuild;
var g_hideImages;


var g_startPauseTime;
var g_stopPauseTime;

var g_appPort;
var g_appStartDir;

const filetypes = ['.jpg', '.jpeg', '.gif', '.mp4', '.png'];  // used to determine which files are supported for display  display.js must be updated to inculde more fileytpes if this is updated



// rebuild all playlists at midnight if g_nightlyrebuild is true
let isRebuilding = false;
async function rebuildall() {
    if (isRebuilding){        
        return;
    }
    isRebuilding = true;
    
    let errorOccured = false;
    ipcRenderer.send('popup', 'Rebuilding Index');
    var PlaylistTables = readPlaylistPaths();
    for (const [TableName, dirPaths] of Object.entries(PlaylistTables)) {    
        errorOccured = await CreateAddPlaylistTable(TableName, dirPaths, true)     
    }  
    ipcRenderer.send('close_popup', '');
    isRebuilding = false;
    
    return errorOccured;
}

let oldSelections = null; // global to cache old selections during playlist rebuilds
async function CreateAddPlaylistTable(PlaylistName, StartingPathArray, FirstRun, FirstRunOriginal = FirstRun) {
    const includeArray = [];
    const excludeArray = [];
    let DynamicArray = [];
    let writetoDB = true;

    // --- Existing logic for dynamic playlists
    const remainingString = PlaylistName.split('_').slice(2).join('_');
    if (remainingString.length !== 0) {
        DynamicArray = remainingString.split('_');
        DynamicArray.forEach(item => {
            if (item.includes('$')) excludeArray.push(item.replace('$', ''));
            else includeArray.push(item);
        });
    }

    if (FirstRun === true) {
        // --- NEW: Cache existing Selected values BEFORE deleting anything
        oldSelections = new Map();
        try {
            // check if table exists already
            const existing = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(PlaylistName);
            if (existing) {
                const rows = db.prepare(`SELECT FilePath, Selected FROM "${PlaylistName}"`).all();
                for (const row of rows) {
                    oldSelections.set(row.FilePath, row.Selected);
                }
            }
        } catch (err) {
            // ignore if table doesn't exist yet
        }

        db.exec(`CREATE TABLE IF NOT EXISTS "${PlaylistName}" (
            id INTEGER PRIMARY KEY,
            PlaylistPaths TEXT,
            DirPath TEXT,
            FilePath TEXT,
            Selected BOOLEAN
        )`);
        // --- Clear existing data        
        db.exec(`DELETE FROM "${PlaylistName}"`);
        FirstRun = false;
    }

    // --- prepare insert
    const insert = db.prepare(`INSERT INTO "${PlaylistName}" (DirPath, FilePath, Selected) VALUES (?, ?, ?)`);
    let containsInclude = true;
    let containsExclude = false;
    let errorOccurred = false;

    for (const StartingPath of StartingPathArray) {
        try {
            const files = await fsPromises.readdir(StartingPath, { withFileTypes: true });
            const dirPromises = [];

            for (const file of files) {
                const filePath = path.join(StartingPath, file.name);

                if (file.isDirectory()) {
                    // recurse
                    dirPromises.push(CreateAddPlaylistTable(PlaylistName, [filePath], false));
                } else {
                    const ext = path.extname(filePath).toLowerCase();
                    if (filetypes.includes(ext)) {
                        if (includeArray.length !== 0)
                            containsInclude = includeArray.some(sub => StartingPath.toLowerCase().includes(sub.toLowerCase()));
                        if (excludeArray.length !== 0)
                            containsExclude = excludeArray.some(sub => StartingPath.toLowerCase().includes(sub.toLowerCase()));
                        writetoDB = containsInclude && !containsExclude;

                        if (writetoDB) {
                            // --- NEW: use old selection if FilePath matches
                            const prevSelected = oldSelections.has(filePath) ? oldSelections.get(filePath) : 0;
                            insert.run(StartingPath, filePath, prevSelected);
                        }
                    }
                }
            }

            await Promise.all(dirPromises);
            await new Promise(resolve => setImmediate(resolve));

        } catch (err) {
            // log or ignoreoldSelections            
        }
    }

    // --- Existing post-build logic
    if (FirstRunOriginal === true) {
        const update = db.prepare(`UPDATE "${PlaylistName}" SET PlaylistPaths = ? WHERE id = ?`);
        StartingPathArray.forEach((StartingPath, index) => {
            update.run(StartingPath, index + 1);
        });

        const row = db.prepare(`SELECT COUNT(*) AS count FROM "${PlaylistName}"`).get();
        if (row.count === 0) {
            db.prepare(`DROP TABLE IF EXISTS "${PlaylistName}"`).run();
            errorOccurred = true;
        } else {
            errorOccurred = false;
        }
    }    
    return errorOccurred;
}



/*
async function CreateAddPlaylistTable(PlaylistName, StartingPathArray, FirstRun, FirstRunOriginal = FirstRun) { // returns true if created, false if error
    const includeArray = [];
    const excludeArray = [];
    let DynamicArray = [];
    let writetoDB = true;

    // Check for dynamic playlist
    const remainingString = PlaylistName.split('_').slice(2).join('_');
    if (remainingString.length !== 0) {
        DynamicArray = remainingString.split('_');
        DynamicArray.forEach(item => {
            if (item.includes('$')) {
                excludeArray.push(item.replace('$', ''));
            } else {
                includeArray.push(item);
            }
        });
    }

    if (FirstRun === true) {
        db.exec(`CREATE TABLE IF NOT EXISTS "${PlaylistName}" (
            id INTEGER PRIMARY KEY,
            PlaylistPaths TEXT,
            DirPath TEXT,
            FilePath TEXT,
            Selected BOOLEAN
        )`);
        db.exec(`DELETE FROM "${PlaylistName}"`);
        FirstRun = false;
    }

    const insert = db.prepare(`INSERT INTO "${PlaylistName}" (DirPath, FilePath, Selected) VALUES (?, ?, ?)`);
    let containsInclude = true;
    let containsExclude = false;
    let errorOccurred = false;

    for (const StartingPath of StartingPathArray) {
        try {
            const files = await fsPromises.readdir(StartingPath, { withFileTypes: true });
            const dirPromises = [];

            for (const file of files) {
                const filePath = path.join(StartingPath, file.name);

                if (file.isDirectory()) {
                    // Recursive call
                    dirPromises.push(CreateAddPlaylistTable(PlaylistName, [filePath], false));
                } else {
                    const ext = path.extname(filePath).toLowerCase();
                    if (filetypes.includes(ext)) {
                        if (includeArray.length !== 0) {
                            containsInclude = includeArray.some(sub => StartingPath.toLowerCase().includes(sub.toLowerCase()));
                        }
                        if (excludeArray.length !== 0) {
                            containsExclude = excludeArray.some(sub => StartingPath.toLowerCase().includes(sub.toLowerCase()));
                        }
                        writetoDB = containsInclude && !containsExclude;

                        if (writetoDB) {
                            insert.run(StartingPath, filePath, 0);
                        }
                    }
                }
            }

            // Wait for recursive directories
            await Promise.all(dirPromises);

            // Yield to the event loop after processing this directory
            await new Promise(resolve => setImmediate(resolve));

        } catch (err) {
            //writeRotateDeleteError(null, null, "error creating playlist during fs.promises.readdir " + StartingPath);            
        }
    }

    if (FirstRunOriginal === true) {
        const update = db.prepare(`UPDATE "${PlaylistName}" SET PlaylistPaths = ? WHERE id = ?`);
        StartingPathArray.forEach((StartingPath, index) => {
            update.run(StartingPath, index + 1);
        });

        // Delete the playlist if empty
        const row = db.prepare(`SELECT COUNT(*) AS count FROM "${PlaylistName}"`).get();
        if (row.count === 0) {
            db.prepare(`DROP TABLE IF EXISTS "${PlaylistName}"`).run();
            errorOccurred = true;
        } else {
            errorOccurred = false;
        }
    }

    return errorOccurred;
}
*/

function deletePlaylist(playlistName){
    var index = 0;
    if (playlistName !=""){         // old function to delete table from 
        while (g_playlists[index].name != playlistName){
         index++;
        }
        g_playlists.splice(index,1);
        writeDataBase();
        // database functions to delete playlist
        db.exec('DROP TABLE IF EXISTS ',playlistName);       
    }else{
        //writeRotateDeleteError(null, null, "no Playlist for delete dbfunction.js");           
    }
}

function addPlaylist(playlistData){
    g_selPLAYLIST = playlistData.name;  // updated which paylist was selected
    g_playlists[g_playlists.length] = playlistData;
    writeDataBase();
}


function readGlobalSettings(){

    const stmt = db.prepare('SELECT Setting, Value FROM global_settings').all();
    const resultObject = {};
    // Iterate over each row and create dynamic properties on the result object
    stmt.forEach(row => {
        resultObject[row.Setting] = row.Value;
    });    
    return resultObject;
  
}



/* read all playlist names from the various tables and return an object of form 
    {
    'playlist_table1': ['dirPath1', 'dirPath2', ...],
    'playlist_table2': ['dirPath3', 'dirPath4', ...],
    ...
    }
*/
function readPlaylistPaths(){
    const tableNames = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'playlist_%'`).all().map(row => row.name);
    const result = {};
    tableNames.forEach(tableName => {
        // Query to select non-null values from 'PlaylistPaths' column
        const rows = db.prepare(`SELECT PlaylistPaths FROM ${tableName} WHERE PlaylistPaths IS NOT NULL`).all();
        
        // Map the result to extract only non-null PlaylistPaths
        result[tableName] = rows.map(row => row.PlaylistPaths);
    });
      
    return result;
}

function readPlaylistTableNames() {  
    const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'playlist_%'`).all();
    // Extract table names into an array    
    const tableNames = result.map(row => row.name.replace(/^playlist_/, ''));
      
    return tableNames;
  }

function readRotateDeleteError(){
    const data = {
        rotate: [],
        delete: [],
        error: []
    };    
    const results = db.prepare('SELECT rotate, remove, error FROM rotate_delete').all(); // cant name column delete, must be reserved keyword
    results.forEach(row => {
        if (row.rotate !== null) {
            data.rotate.push(row.rotate);
        }
        if (row.remove !== null) {
            data.delete.push(row.remove);
        }
        if (row.error !== null) {
            data.error.push(row.error);
        }
    });    
      
    return data;
}

// clear all data from rotate_delete table
function ClearRotateDelete(){    
    db.prepare('DELETE FROM '+'rotate_delete').run();          
}


// pass in null for Rotate, Delete, Reset not used for the specific writing
function writeRotateDeleteError(Rotate, Delete, Error) {
  // Count current rows
  const rowCount = db.prepare('SELECT COUNT(*) AS count FROM rotate_delete').get().count;
  // If 200 or more, delete the oldest (assumes you have an auto-increment 'id' column)
  if (rowCount >= 20   ) { 
    db.prepare('DELETE FROM rotate_delete WHERE id = (SELECT id FROM rotate_delete ORDER BY id ASC LIMIT 1)').run();
  }
  // Insert the new error row
  db.prepare('INSERT INTO rotate_delete (rotate, remove, error) VALUES (?, ?, ?)').run(Rotate, Delete, Error);
}

function readDataBase(){             
    GlobalSettings = readGlobalSettings();       
    g_playlists = readPlaylistTableNames();
    g_prefetchNUM = GlobalSettings.prefetchNUM;    
    g_selPLAYLIST = GlobalSettings.selPLAYLIST;
    g_preloadNUM = GlobalSettings.preloadNUM;
    g_basedelay = GlobalSettings.baseDELAY;
    g_nightlyrebuild = (GlobalSettings.nightlyRebuild.toLowerCase() === 'true');            
    g_startPauseTime = GlobalSettings.startPauseTime;
    g_stopPauseTime=GlobalSettings.stopPauseTime;
    g_appPort=GlobalSettings.appPort;
    g_appStartDir=GlobalSettings.appStartDir;
    g_hideImages = GlobalSettings.hideImages                                          
}

function writeDataBase(){    
    var GlobalSettingsObj =[
        { name: 'baseDELAY', value: g_basedelay },
        { name: 'prefetchNUM', value: g_prefetchNUM },
        { name: 'selPLAYLIST', value: g_selPLAYLIST },  
        { name: 'preloadNUM', value: g_preloadNUM },
        { name: 'nightlyRebuild', value: g_nightlyrebuild },        
        { name: 'startPauseTime', value: g_startPauseTime },
        { name: 'stopPauseTime', value: g_stopPauseTime },        
        { name: 'appPort', value: g_appPort },
        { name: 'appStartDir', value: g_appStartDir },
        { name: 'hideImages', value: g_hideImages }
    ]
    const stmt = db.prepare('UPDATE global_settings SET Value = ? WHERE Setting = ?');    
    GlobalSettingsObj.forEach(({ name, value}) => {
        stmt.run(value.toString(), name);
    });                  
    readDataBase();
}




