// contains all the require elements for every .html file

const fs = require('fs');  // used for all file i/o

const path = require('path'); // used to for path info
const { ipcRenderer } = require('electron'); // node used to pass info from render to main.js

const util = require('util');    // used to promisify functions
const child = require('child_process'); // for calling cmd line functions


const { exec } = require('child_process');
const { execFile } = require('child_process');   


const { ExifTool } = require('exiftool-vendored');  //the curly brackets { ExifTool } destructures the ExifTool property from the module's exports, so you can use it directly in your code
const exiftool = new ExifTool();

// cleanup any open modules before unloading page and closing app in main.js
window.addEventListener("beforeunload", function () {     
    db.close((err) => {
        if (err) {
            errmsg = "error closing database " + err.message;
            //writeRotateDeleteError(null, null, errmsg);   
        }
    });                      
    exiftool.end((err) => {
        if (err) {
            errmsg = "error closing exiftool " + err.message;
           // writeRotateDeleteError(null, null, errmsg);                        
        }
    });
});


function Timer(fn, t) {
    let timerObj = null;
    let interval = t;

    function startInterval(runImmediately) {
        if (runImmediately) fn();   // run now if requested
        timerObj = setInterval(fn, interval);
    }

    this.start = function() {
        if (!timerObj) {
            startInterval(true); // first start: run immediately
        }
        return this;
    };

    this.stop = function() {
        if (timerObj) {
            clearInterval(timerObj);
            timerObj = null;
        }
        return this;
    };

    this.reset = function(newT) {
        if (newT !== undefined) {
            interval = newT;
        }
        this.stop();
        startInterval(true); // restart: run immediately
        return this;
    };

    // auto-start on creation
    this.start();
}

function OneShotTimer(fn, delay, onStop) {
    let timerObj = setTimeout(() => {
        fn();
        timerObj = null;
    }, delay);

    this.stop = function() {
        if (timerObj) {
            clearTimeout(timerObj);
            timerObj = null;
            if (onStop) onStop();  // invoke external resolve if provided
        }
        return this;
    }
}


/*
function OneShotTimer(fn, delay) {
    var timerObj = setTimeout(function() {
        // Your code to run once after delay
        fn();
    }, delay);

    this.stop = function() {
        if (timerObj) {
            clearTimeout(timerObj);
            timerObj = null;
        }
        return this;
    }
}
*/