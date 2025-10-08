/* ideas and bugs */
rotate video file with ffmpeg, but set a max file size to do this





/* max file size info*/
max size video (and image) is 384MB (so a little smaller) due max convert size of Base64 function

/*icon website*/
https://fontawesome.com/search?q=Configure&o=r

/*better-sqlite3 database*/
need to make sure electron and electron builder are up to date to rebuild better-sqlite3 to the version I have installed
npm install --save-dev @electron/rebuild (used to rebuild better-sqlite3)
add this line to package.json for rebuilding    
/* below is no longer used as of 9/22/2025
"rebuild": ".\\node_modules\\.bin\\electron-rebuild.cmd -f -m ./node_modules/better-sqlite3",
/* now use:
npx electron-builder install-app-deps
npm install better-sqlite3
https://www.npmjs.com/package/better-sqlite3
also make sure these dev dependancies are up to date: 
  "devDependencies": {    
    "electron": "^31.3.1",
    "electron-build": "^0.0.3",
    "electron-builder": "^20.44.4"
  },

/*exif parser module*/
https://www.npmjs.com/package/exiftool-vendored
npm install --save exiftool-vendored
  


/*files for edit during distrution*/
playlistsDB.db and playlistsDB_dist.db and in res_dist directory
in playlistsDB.db "runtime":"1" is a flag used to set directory paths in runtime vs. development mode.  DBFunctions.js looks at this flag
main.js contains var devtools = true; // enables dev tool windows  Set to false for distribution, true to enable debug windows

/* for EXIF data reading and setting */
(https://github.com/hMatoba/piexifjs)
npm install piexifjs --save

/* using onvif install from github npm install onvif */
using video.js npm install video.js
basic information
/webapi/<CGI_PATH>?api=<API_NAME>&version=<VERSION>&method=<METHOD>[&<PARAMS>][&_sid=<SID>]
hostname: "192.168.2.54"
username: "admin"
password: "Bli936jY"
http://admin:Bli936jY@192.168.2.54/common/info.cgi
http://192.168.2.54/config//stream_info.cgi
http://192.168.2.54/video/mjpg.cgi?profileid=1 - video stream location
    
/*chrome debugger not synched with VM html and actual html*/
force clear the cache with Ctrl+Shift+R

/*for building*/
in main.js line 9, change var devtools = false;
npm run dist
edit package.json to change version number

/* for installing to program files vs %appdata%*
in package.json the nsis section determines install location
 "nsis": {
      "oneClick": true,
      "perMachine": true, //if set to false installs in %appdata% if true installs to program files.  default is false
      "allowElevation": false,
      "allowToChangeInstallationDirectory": false,
      "runAfterFinish": false,
      "installerIcon": "./build/icon.ico"
    },

/*dependancies*/
node.js
    https://nodejs.org/en/download/
electron 
    https://electronjs.org/docs/tutorial/installation
    npm install electron --save-dev
npm - this is typcially installed with node.js
    https://www.npmjs.com/get-npm

html server
https://expressjs.com/ for lightweight html server.  Used for web app
npm install express



/*installer help*/
https://www.electron.build/configuration/nsis
https://github.com/electron-userland/electron-builder/issues/1131
https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/1154
https://medium.com/how-to-electron/a-complete-guide-to-packaging-your-electron-app-1bdc717d739f
npm i electron-builder

/*ensuring 'require' works in electron*/
Not an issue with the installed version of electron now but As of version 5, the default for nodeIntegration changed from true to false. which means require does not work.  You can enable it when creating the Browser Window:

      mainWindow = new BrowserWindow(
        {width: 1500, height: 600, maximizable: true, resizable: true, frame: true,
        webPreferences: {nodeIntegration: true, contextIsolation: false}}        
      );;

/*for video conversion*/
batch convert avi to mp4
1) download handbrake
2) download handbrakecli (comand line interface).  Make sure to update path in script to handbrackcli.exe install path
3) run powershell in windows
4) navagate to top level directory where avi files are located
5) run the script below.  Script finds avi file, converts it and copies the converted file into the same directory

NOTES:  Very Fast 1080p30 is an existing preset in handbrake.  change if you want a different preset

/*script for AVI to MP4*/
$handbrake = "C:\Program Files\HandBrake\HandBrakeCLI.exe"
$files = @(Get-ChildItem . *.avi -Recurse | Where {$_ -notmatch '-convert\.avi$'})
foreach ($file in $files) {
    $newFileName = $file.Fullname -replace '\.avi$','-convert.mp4'    
    & $handbrake -i $file.FullName -o $newFileName --preset "Very Fast 1080p30"
    if ($LastExitCode -ne 0) { Write-Warning "Error converting $($file.FullName)" }
}

/*script for MOV to MP4*/
$handbrake = "C:\Program Files\HandBrake\HandBrakeCLI.exe"
$files = @(Get-ChildItem . *.mov -Recurse | Where {$_ -notmatch '-convert\.mov$'})
foreach ($file in $files) {
    $newFileName = $file.Fullname -replace '\.mov$','-convert.mp4'    
    & $handbrake -i $file.FullName -o $newFileName --preset "Very Fast 1080p30"
    if ($LastExitCode -ne 0) { Write-Warning "Error converting $($file.FullName)" }
}

/*script for MTS to MP4*/
$handbrake = "C:\Program Files\HandBrake\HandBrakeCLI.exe"
$files = @(Get-ChildItem . *.mts -Recurse | Where {$_ -notmatch '-convert\.mts$'})
foreach ($file in $files) {
    $newFileName = $file.Fullname -replace '\.mts$','-convert.mp4'    
    & $handbrake -i $file.FullName -o $newFileName --preset "Very Fast 1080p30"
    if ($LastExitCode -ne 0) { Write-Warning "Error converting $($file.FullName)" }
}

/*script for WMV to MP4*/
$handbrake = "C:\Program Files\HandBrake\HandBrakeCLI.exe"
$files = @(Get-ChildItem . *.wmv -Recurse | Where {$_ -notmatch '-convert\.wmv$'})
foreach ($file in $files) {
    $newFileName = $file.Fullname -replace '\.wmv$','-convert.mp4'    
    & $handbrake -i $file.FullName -o $newFileName --preset "Very Fast 1080p30"
    if ($LastExitCode -ne 0) { Write-Warning "Error converting $($file.FullName)" }
}


/* for converting mov and mp4 to animated gifs */
download  binary of ffmpeg at https://www.ffmpeg.org/download.html#build-windows

launch powershell

$ffmpeg = "C:\Users\Admin\Desktop\ffmpeg-20191113-a7245ad-win64-static\bin\ffmpeg.exe"
$files = @(Get-ChildItem . *.mov)
foreach ($file in $files){
    $newFileName = $file.Fullname -replace '\.mov$','-converted.gif'
    & $ffmpeg -i $file.FullName -vf scale=1440x1088 $newFileName -hide_banner
}

$ffmpeg = "C:\Users\Admin\Desktop\ffmpeg-20191113-a7245ad-win64-static\bin\ffmpeg.exe"
$files = @(Get-ChildItem . *.mp4)
foreach ($file in $files){
    $newFileName = $file.Fullname -replace '\.mp4$','-converted.gif'
    & $ffmpeg -i $file.FullName -vf scale=1440x1088 $newFileName -hide_banner
}

qr code generator used in playlist.html
https://github.com/davidshimjs/qrcodejs


batch rename with powershell files based on the directory name and number of files in directory dirname_filenumber
# Define the top directory as the current directory
$topDirectory = Get-Location

# Function to rename files in a directory
function Rename-FilesInDirectory {
    param (
        [string]$directoryPath
    )
    
    # Get all files in the directory
    $files = Get-ChildItem -Path $directoryPath -File
    
    # Initialize the file count
    $fileCount = 0
    
    # Loop through each file and rename it
    foreach ($file in $files) {
        # Create the new file name
        $newFileName = "$($directoryPath | Split-Path -Leaf)_$fileCount$($file.Extension)"
        
        # Define the full path for the new file name
        $newFilePath = Join-Path -Path $directoryPath -ChildPath $newFileName
        
        # Rename the file
        Rename-Item -Path $file.FullName -NewName $newFilePath
        
        # Increment the file count
        $fileCount++
    }
}

# Recursively process each directory
function Process-Directory {
    param (
        [string]$currentDirectory
    )
    
    # Process the current directory
    Rename-FilesInDirectory -directoryPath $currentDirectory
    
    # Get all subdirectories
    $subdirectories = Get-ChildItem -Path $currentDirectory -Directory
    
    # Recursively process each subdirectory
    foreach ($subdirectory in $subdirectories) {
        Process-Directory -currentDirectory $subdirectory.FullName
    }
}

# Start processing from the top directory
Process-Directory -currentDirectory $topDirectory

/* powershell script recursively rename files in directories with directory name and count number */
/* skips directory named 'home movies' so it does not rename any of these files */
# Get the top directory (current directory)
$topDirectory = Get-Location

# Function to recursively rename files in directories
function Rename-Files {
    param ([string]$currentDirectory)
    
    # Skip directories named "home movies"
    if ((Split-Path $currentDirectory -Leaf).ToLower() -eq "home movies") {
        return
    }
    
    # Rename files in the current directory
    Get-ChildItem -Path $currentDirectory -File | ForEach-Object -Begin { $count = 0 } -Process {
        $newFileName = "$((Split-Path $currentDirectory -Leaf))_$count$($_.Extension)"
        Rename-Item -Path $_.FullName -NewName (Join-Path $currentDirectory $newFileName)
        $count++
    }

    # Process subdirectories recursively
    Get-ChildItem -Path $currentDirectory -Directory | ForEach-Object {
        Rename-Files -currentDirectory $_.FullName
    }
}

# Start renaming files from the top directory
Rename-Files -currentDirectory $topDirectory
