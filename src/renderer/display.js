//Sets or resets images and text displayed.  
function SetUIimageorData(DivID, Reset, Data){    
    const element = document.querySelector(DivID);
    switch (DivID) {         
        case '#LoadedImages':
        case '#ImagesinDB':
        case '#imagelocation':
        case '#helptxt':
            if (Reset){
                element.innerHTML = " ";                
            }else{
                element.innerHTML = Data;
                setTimeout(function(){
                    element.innerHTML = " ";                
                },15000);
            }            
        break;    
        case '#pause':                
        case "#readingimages":
        case "#wifi":
        case "#IntervalPause":  
        case "#imageHideable":   
        case "#imageComments":
            if (Reset){
                element.src = '';                
            }else{
                element.src = Data;                
            }
        break;
        case '#noRotation':
            if (Reset){
                element.src = '';    
            }else{
                element.src = Data;
            }
        break;
        case '#HideImage':            
            element.src = Data;                    
            setTimeout(function(){    
                element.src = '';
            },1500);    
        break;
        case '#pulse-circle':            
            if (Reset) {
                element.style.display = "none";
                element.style.animation = "none";
                element.removeAttribute("fill");                
            } else {
                element.style.display = "block";
                element.style.animation = "pulse 1.5s infinite";
                element.setAttribute("fill", "blue");
                element.setAttribute("fill", "rgb(116, 192, 252)");
            }
        break;
        case '#microphone':
            if (Reset){
                element.src = '';
            }else{
                element.src = Data;
            }
        break;
        default:
        return;
    }
}

async function forward_back(direction){ // direction forward, backward
   // reset main loop timer
   // reset circle animation]    
   let wasPaused = false;
   if (VideoLoopTimer != null) {      
        VideoLoopTimer.stop(); // stop the video loop timer if it is running and sets videolooptimer = null in .close()
        videoloopdone = true;         
    }   

    if (g_playpause == 0){ // 0 paused, 1 playing
        document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'p'}));
        wasPaused = true;
    }

   const countdownTimer = document.getElementById("countdowntimer");
   countdownTimer.style.animation = "none";
   setTimeout(function() {
         countdownTimer.style.animation = "countdown " + g_basedelay/1000 +"s linear infinite forwards";
   }, 20); //need a small delay for the reset to take

    if (direction == 'forward'){    
        //imgctr++;             
        displaylooptimer.reset();  // reseting auto loads the next image         
    }else{  // direction is back
        imgctr=imgctr - 2;   
        //imgctr--;
        if (imgctr < 0){
            imgctr = 0;
        }              
        displaylooptimer.reset();  // reseting autoloads the image
    }  
    
    if (wasPaused){
        document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'p'}));
    } 
    
}

async function selectRandomImages(PlaylistName, ImagesPerDir, ImagestoPreload) {    
    var SelectedImages = [];
    let attempts = 0;   
    const maxAttempts = 1000; // safety margin  so we dont get stuck in a loop

    while (SelectedImages.length < ImagestoPreload && attempts < maxAttempts){            
        attempts++;
        ImagesPerDir = Math.min(ImagesPerDir, ImagestoPreload - SelectedImages.length);
        var ImageDirPaths = db.prepare('SELECT DISTINCT DirPath FROM '+ PlaylistName +' WHERE Selected = 0').all();
        
        if (ImageDirPaths.length == 0) { // all images have been selected, so reset selection            
            db.exec('UPDATE '+ PlaylistName +' SET Selected = 0'); // Reset all selected files if no files are left
            ImageDirPaths = db.prepare('SELECT DISTINCT DirPath FROM '+ PlaylistName +' WHERE Selected = 0').all();            
        }           
        
        dirPath = ImageDirPaths[Math.floor(Math.random() * ImageDirPaths.length)]; //grab a random starting directory       
        dirPath = dirPath.DirPath;  //get the starting directory as dirPath is an object with a DirPath property
        ImagesInDir = db.prepare('SELECT * FROM '+ PlaylistName +' WHERE DirPath = ? AND Selected = 0').all(dirPath);  //grab all file paths with that startin dir                
                
        //for (let i = 0; i <= Math.min(ImagesPerDir, ImagesInDir.length); i++) {
        let processed = 0;
        while (processed < ImagesPerDir && ImagesInDir.length > 0) {
            processed++;
            let randomIndex = Math.floor(Math.random() * ImagesInDir.length);
            let ImageTableRow = ImagesInDir.splice(randomIndex, 1)[0];     // picks a random image from the array and removes it from the array       
            
            if (g_hideImages == 1) {
                const fileExtension = ImageTableRow.FilePath.split('.').pop().toLowerCase();
                if (fileExtension === 'jpg' || fileExtension === 'jpeg') {  // only check jpg and jpeg files
                    filedata = await EXIFGetImageData(ImageTableRow.FilePath);
                } else if (fileExtension === 'mp4' || fileExtension === 'MP4') { // only check mp4 and mov files
                    filedata = await MP4GetVideoData(ImageTableRow.FilePath); // Call the function to get MP4 data
                } else{
                    filedata = { hidden: false, comment: null }; // default
                }

                if (filedata.hidden) { // if image is hidden go ahead and set it to 0 for selected and skip it  
                    db.prepare('UPDATE '+ PlaylistName +' SET Selected = 1 WHERE id = ?').run(ImageTableRow.id);                                 
                }else{
                    db.prepare('UPDATE '+ PlaylistName +' SET Selected = 1 WHERE id = ?').run(ImageTableRow.id);
                    SelectedImages.push(ImageTableRow.FilePath);                    
                }
            }else{
                // Mark the selected file as selected            
                db.prepare('UPDATE '+ PlaylistName +' SET Selected = 1 WHERE id = ?').run(ImageTableRow.id);
                SelectedImages.push(ImageTableRow.FilePath);                              
            }
        }

    }

    if (attempts >= maxAttempts) {
        writeRotateDeleteError(null, null, "selectRandomImages aborted: too many attempts without filling preload.");          
    }    

    return SelectedImages;
}
    
function updateLoadedItemMetaData(data){
    selectItemPath = data.ImagePath;
    Comments = data.dbEXIFImageComments;
    HiddenFlag = data.dbEXIFHiddenImages;
    console.log(HiddenFlag)
    LoadedImagesData.forEach((value, index) => {
        if (value.FilePath == selectItemPath){
            LoadedImagesData[index].HiddenFlag = HiddenFlag; 
            LoadedImagesData[index].Comments = Comments; 
            if (HiddenFlag){
                SetUIimageorData("#imageHideable", false, './assets/images/app hide.png');
            }else{
                SetUIimageorData("#imageHideable", true, null);    
            }
            if (Comments != null && Comments.length > 0){
                SetUIimageorData("#imageComments", false, './assets/images/imgcomments.png');
            }
            else{
                SetUIimageorData("#imageComments", true, null);
            }
        }
    });
}

async function addLoadedImagesData(filePath) {

// true/false for hiddenFlag and text or null for imageComment
    //let filedata = { hidden: false, comment: null }; // default
    // Check if the file extension is jpg or jpeg
    try{
        fs.accessSync(filePath, fs.constants.F_OK); 
        const fileExtension = filePath.split('.').pop().toLowerCase();    
        if (fileExtension === 'jpg' || fileExtension === 'jpeg') {  // only check jpg and jpeg files
            filedata = await EXIFGetImageData(filePath);
        } else if (fileExtension === 'mp4' || fileExtension === 'MP4') {  // only check mp4 and mov files
            filedata = await MP4GetVideoData(filePath); // Call the function to get MP4 data
        }else{ // not a jpg or mp4
            filedata = { hidden: false, comment: null }; // default
        }
    } catch (err){
        filedata = { hidden: false, comment: null }; // default
        filePath =  path.join(path.dirname(__dirname), "renderer", "assets", "images", "offline.mp4");  
    }
    // Add the data to the LoadedImagesData array
    LoadedImagesData.push({
        FilePath: filePath,
        HiddenFlag: filedata.hidden,
        Comments: filedata.comment,
    });
}

async function MP4GetVideoData(videoPath) {  
    // true/false for hiddenFlag and text or null for imageComment 
    let hiddenflag = false; // Initialize hidden flag
    let usercomments = null; // Initialize user comments    
    let ffmpegPath = path.join(__dirname, '..', 'renderer', 'assets', 'ffmpeg', 'ffmpeg.exe');    
    // Use ffmpeg to read metadata
    const args = ['-i', videoPath, '-f', 'ffmetadata', '-'];
    try {
        const stdout = await new Promise((resolve, reject) => {                        
            execFile(ffmpegPath, args, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error reading metadata: ${stderr}`);
                } else {
                    resolve(stdout);
                }
            });
        });

        // Extract the comment from the metadata
        const metadata = stdout.toString();

        const commentIndex = metadata.indexOf('comment=');
        if (commentIndex !== -1) {
            // Extract everything after 'comment='
            let comment = metadata.slice(commentIndex + 'comment='.length).trim();

            // replace <br> with \n
            comment = comment.replace(/<br>/g, '\n');

            // Remove "encoder" and anything after it if it exists in the comment
            if (comment.includes('encoder')) {
                comment = comment.slice(0, comment.indexOf('encoder')).trim();
            }
            // clean up escapte characters
            comment = comment.replace(/\\/g, '');

            // Handle "Hiddenflag=Hidden" logic
            if (comment.startsWith('Hiddenflag=Hidden')) {                
                hiddenflag = true; // Set hidden flag to true
                comment = comment.slice('Hiddenflag=Hidden'.length).trimStart();              
            }
            if (comment.length > 0) {
                // Store the comment in the ImageComment table
                usercomments = comment; // Set user comments to the stripped comment                
            }          
        }        
    } catch (error) {
        const errortext = `Error handling Video Data at display.js: ${videoPath}`;
        //writeRotateDeleteError(null, null, errortext);    
        hiddenflag = false; // Set hidden flag to false 
        usercomments = null; // Set user comments to null      
    }
    return {hidden: hiddenflag, comment: usercomments};    
}

async function EXIFGetImageData(imagePath) {   
    // true/false for hiddenFlag and text or null for imageComment 
    let hiddenflag = false; // Initialize hidden flag
    let usercomments = null; // Initialize user comments
    try {
        const metadata = await exiftool.read(imagePath);

        if (metadata.UserComment) {        
            if (metadata.UserComment.includes("Hiddenflag=Hidden")) {

                hiddenflag = true; // Set hidden flag to true

                // Remove "Hiddenflag=Hidden" from the comment
                const strippedComment = metadata.UserComment.replace("Hiddenflag=Hidden", "").trim();

                // If there is any remaining text, store it in the ImageComments table
                if (strippedComment) {                    
                    usercomments = strippedComment; // Set user comments to the stripped comment
                }
            } else {
                hiddenflag = false; // Set hidden flag to false
                usercomments = metadata.UserComment; // Set user comments to the full UserComment text
            }        
        }
    } catch (err) {
        const errortext = `Error reading EXIF at display.js: ${imagePath}`;
        //writeRotateDeleteError(null, null, errortext);
        hiddenflag = false; // Set hidden flag to false
        usercomments = null; // Set user comments to null    
    }
    return {hidden: hiddenflag, comment: usercomments};
}

let copying = false;
async function copy_images(){
    
    if (copying){return};
    copying = true;
    
    let SelectedImagePaths = [];      
    let imagecount = 0;
    let attempts = 0; //just in case we get stuck in a loop

    //  clear any display errors  
    SetUIimageorData('#wifi', true, null);      
              
    g_Base64Images = [];  //clear images from base64image array for new copy
    LoadedImagesData =   []; // clear loaded images data array defined in display.html
  
  
    while (imagecount < g_preloadNUM && attempts < 1000) { // limit attempts to avoid infinite loop
        attempts++;            
        SelectedImagePaths =  await selectRandomImages(g_selPLAYLIST, g_prefetchNUM, g_preloadNUM);            
        for (const SelectedImagePath of SelectedImagePaths) {
            await addLoadedImagesData(SelectedImagePath); // add to loaded images data array  
            imagecount++;                   
        }
    }

    LoadedImagesData.forEach((data, index) => {        
        LoadedImage = data.FilePath; // get the file path from the data object
        fileExtension = path.extname(LoadedImage).toLowerCase(); 
        let mimeType;
        switch (fileExtension) {
            case '.gif':
                mimeType = 'image/gif';
                break;
            case '.png':
                mimeType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                mimeType = 'image/jpeg';
                break;
            case '.mp4':
                mimeType = 'video/mp4';
                break;
            default:                
            return;
        }            
        try{
            filedata = fs.readFileSync(LoadedImage);
            const base64Image = `data:${mimeType};base64,${filedata.toString('base64')}`;
            g_Base64Images.push(base64Image);                

        }catch(err){                
            writeRotateDeleteError(null, null, " copy error " + LoadedImage);
            LoadedImage = path.join(path.dirname(__dirname), "renderer", "assets", "images", "offline.mp4");
                        
            filedata = fs.readFileSync(LoadedImage);  //error check here as well!  or just create a base64 of the offline.mp4?            
                        
            const base64Image = `data:${'video/mp4'};base64,${filedata.toString('base64')}`;
            g_Base64Images.push(base64Image);                 
        }
    });  
    copying = false;  
};

/* promise that returns once the selected image has loaded for scaling.  Thats all this function
 is used for.  Set visibility to hidden to avoid flicker during load
*/
async function getsize(Base64Image){
   return new Promise(function(resolve,reject){
       var img = new Image();
       img.src = Base64Image;
       img.style.visibility = 'hidden';
       
       img.onload = function () {
           resolve(img);
       }      
   });
}


function getImagetoSee(){
    let ItemSrc = null;
    let ItemInfo = {imagePath:'', imageBase64:'', Index:null}; 
    
    if (!imagetosee.includes("video")){  // its an image  imgatetosee is a global defined in display.html
        ItemSrc = (!fadetoggle) ? document.getElementById('mainimg').src : document.getElementById('mainimg2').src;        
    }else{ // its a video
        ItemSrc =  document.getElementById("playvideo").src;
    }

    ItemInfo = {imagePath:LoadedImagesData[imgctr-1].FilePath, imageBase64:g_Base64Images[imgctr-1], Index:imgctr-1};
    
    return ItemInfo;    
}

let rotatingMP4 = false;
async function rotateMP4(ItemInfo) {       
    if (rotatingMP4 || ItemInfo.imagePath.includes("offline.mp4")){  // test if currently rotating and abort if rotating
        return;
    }

    
    Videosrc = ItemInfo.imageBase64;
    videoPath = ItemInfo.imagePath;
    index = ItemInfo.Index;
  

    rotatingMP4 = true;
    let ffmpegPath = path.join(__dirname, '..', 'renderer', 'assets', 'ffmpeg', 'ffmpeg.exe');

    // Temp rotated output
    let outputPath = videoPath.replace(/\.mp4$/i, '_rotated.mp4');

    const args = [
        '-i', videoPath,
        '-vf', 'transpose=1',
        '-c:a', 'copy',
        outputPath
    ];

    try {
        SetUIimageorData('#noRotation', false, './assets/images/copyfiles.png');
        await new Promise((resolve, reject) => {
            execFile(ffmpegPath, args, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error rotating video: ${stderr}`);
                } else {
                    resolve(stdout);
                }
            });
        });

        // Replace original only if rotation succeeded
        fs.renameSync(outputPath, videoPath);        

        try{
            mimeType = 'video/mp4';
            data = fs.readFileSync(videoPath);
            const imagetosee = `data:${mimeType};base64,${data.toString('base64')}`;            

            LoadedImagesData.forEach((value, index) => {
                if (value.FilePath == videoPath){                
                    g_Base64Images[index] = imagetosee; // or imagetosee again
                }
            });
            
            SetVideoScaleStyleAttr(imagetosee);
            document.getElementById("playvideo").setAttribute("src", imagetosee);   
            document.getElementById("playvideo").play().catch(err => {
                if (err.name !== "AbortError") {
                // do nothing, ignore error and continue
                }
            });                         
        }catch(err){       
            SetUIimageorData('#noRotation', false, './assets/images/badrotateimage.png');            
            setTimeout(function(){    
                SetUIimageorData('#noRotation', true,null);            
            },1500);             
            
        }
            
        rotatingMP4 = false; // no longer rotating
        SetUIimageorData('#noRotation', false, './assets/images/goodrotateimage.png');
        setTimeout(function(){    
            SetUIimageorData('#noRotation', true,null);            
        },1500);
                            
    } catch (err) {     
        rotatingMP4 = false;
        SetUIimageorData('#noRotation', false, './assets/images/badrotateimage.png');
        setTimeout(function(){    
            SetUIimageorData('#noRotation', true,null);            
        },1500);             
        
        // Cleanup failed output if exists
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }     
    }    
    //SetUIimageorData('#noRotation', true,null);
}


async function rotateImage(rotationValue, ItemInfo){    
    var whichmain;
    var whichbg;
    var base64Data = null;
    const validExts = ["png", "jpg", "jpeg"];

    Imagesrc = ItemInfo.imageBase64;
    ImagePath = ItemInfo.imagePath;
    ImageIndex = ItemInfo.Index;
    

    fileExt = (ImagePath.substring(ImagePath.lastIndexOf(".")+1)).toLowerCase();  

    if (!validExts.includes(fileExt)) {    
        writeRotateDeleteError(ImagePath,null,null)    
        SetUIimageorData('#noRotation', false, './assets/images/badrotateimage.png');            
        setTimeout(function(){    
            SetUIimageorData('#noRotation', true,null);            
        },1500);
        return;        
    }        
    
    SetUIimageorData('#noRotation', false, './assets/images/goodrotateimage.png');     

    var canvas = document.createElement("canvas");             
  
    if (fadetoggle){
        whichmain = '#mainimg2';
        whichbg = '#bg_img2';
    }else{
        whichmain = '#mainimg';        
        whichbg = '#bg_img';
    }        

    imgData = await getsize(Imagesrc);    

    rotationValue = 90;
    switch (rotationValue){
        case 90:
            canvas.width = imgData.height;
            canvas.height = imgData.width;             
        break;
        case 180:
            canvas.width = imgData.width;
            canvas.height = imgData.height;                   
        break;
        case 270:
            canvas.width = imgData.height;
            canvas.height = imgData.width;                                    
        break;
        default:
            canvas.width = imgData.width;
            canvas.height = imgData.height;                                          
        break;
    }       


    ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2,canvas.height / 2);    
    ctx.rotate(rotationValue*Math.PI/180); //degrees*Math.PI/180     

    const response = await fetch(Imagesrc);   // Imagesrc is your base64 string
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);


    switch (fileExt){
        case 'png':
            mimeType = 'image/png'            
            base64Data = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");                
        break;
        case 'jpeg':
        case 'jpg':
            mimeType = 'image/jpeg'            
            base64Data = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "");                
        break;                
        default:
            base64Data = null;
            SetUIimageorData('#noRotation', false, './assets/images/badrotateimage.png');
            setTimeout(function(){    
                SetUIimageorData('#noRotation', true,null);            
            },1500);     
            return;
        break;  // ignored to due return value above;
    }
    
    try{
      
        fs.writeFileSync(ImagePath,  base64Data, 'base64');       
        
        filedata = fs.readFileSync(ImagePath);
        imagetosee = `data:${mimeType};base64,${filedata.toString('base64')}`;
        
        LoadedImagesData.forEach((value, index) => {
            if (value.FilePath == ImagePath){                
                g_Base64Images[index] = imagetosee; // or imagetosee again
            }
        })


        const img = await getsize(imagetosee);

        // Check scaling in case the image needs to be scaled up or down to fit the window
        let ScaleSmallPhoto = 1.0;
        if ((img.height + 100) < window.innerHeight) {
            ScaleSmallPhoto = parseFloat((window.innerHeight - 150) / img.height + 1).toPrecision(3);  // -150 is used to prevent scaling too large
        }

        // Apply the styles to the main image and background image
        document.querySelector(whichmain).setAttribute("style", "transform: translate(-50%, -50%) rotate(0deg) scale(" + ScaleSmallPhoto + "); max-width: none");
        document.querySelector(whichbg).setAttribute("style", "transform: translate(0%, 0%) rotate(0deg) scale(1); max-width: none");
            
        document.querySelector(whichmain).setAttribute("src", imagetosee);
        document.querySelector(whichbg).setAttribute("src", imagetosee);

        SetUIimageorData('#noRotation', true,null);            
                

    }catch(err){                  

        SetUIimageorData('#noRotation', false, './assets/images/badrotateimage.png');
        setTimeout(function(){    
            SetUIimageorData('#noRotation', true,null);            
        },1500);                
    }     
}


// scale the image if needed and setup html attributes
async function SetImageScaleStyleAttr(Base64Image, fade){    
    //determine which image is fading in and out
    var whichmain;
    var whichbg;
    if (fade){
        whichmain = '#mainimg';
        whichbg = '#bg_img';
    }else{
        whichmain = '#mainimg2';
        whichbg = '#bg_img2';
    }

    try {
        // Wait until getsize resolves
        const img = await getsize(Base64Image);

        // Check scaling in case the image needs to be scaled up or down to fit the window
        let ScaleSmallPhoto = 1.0;
        if ((img.height + 100) < window.innerHeight) {
            ScaleSmallPhoto = parseFloat((window.innerHeight - 150) / img.height + 1).toPrecision(3);  // -150 is used to prevent scaling too large
        }

        // Apply the styles to the main image and background image
        document.querySelector(whichmain).setAttribute("style", "transform: translate(-50%, -50%) rotate(0deg) scale(" + ScaleSmallPhoto + "); max-width: none");
        document.querySelector(whichbg).setAttribute("style", "transform: translate(0%, 0%) rotate(0deg) scale(1); max-width: none");

    } catch (err) {            
        // Handle the error if getsize fails        
        //writeRotateDeleteError(null, null, 'cannot resize image ',LoadedImagesData[imgctr].FilePath);
        document.querySelector(whichmain).setAttribute("style", "transform: translate(-50%, -50%) rotate(0deg) scale(1); max-width: none");
        document.querySelector(whichbg).setAttribute("style", "transform: translate(0%, 0%) rotate(0deg) scale(1); max-width: none");
    }       
}

//scale video element if needed and setup html attributes
function SetVideoScaleStyleAttr(base64Video) {
    const videoElement = document.getElementById('playvideo');    
    
    // Create a temporary video element to get the video dimensions from the Base64 data
    const tempVideo = document.createElement('video');
    tempVideo.src = base64Video;
        
    try{
        // Wait for the metadata to be loaded and extract the dimensions    
        tempVideo.onloadedmetadata = function () {
            const videoWidth = tempVideo.videoWidth;
            const videoHeight = tempVideo.videoHeight;
        
            // Calculate the aspect ratio of the video
            const aspectRatio = videoWidth / videoHeight;
        
            // Get the maximum dimensions (90% of the viewport size)
            const maxWidth = window.innerWidth * 0.99; // 99% of the viewport width
            const maxHeight = window.innerHeight * 0.99; // 98% of the viewport height
        
            // Calculate the width and height while maintaining the aspect ratio
            let width, height;
            if (maxWidth / maxHeight > aspectRatio) {
            width = maxHeight * aspectRatio;
            height = maxHeight;
            } else {
            width = maxWidth;
            height = maxWidth / aspectRatio;
            }

            videoElement.setAttribute('style', `
                width: ${width}px;
                height: ${height}px;  
                position: absolute;
                z-index: 5;                
            `);
      
        }
    }catch (err){ // incase video file is bad and cant load metadata
        //writeRotateDeleteError(null, null, 'cannot resize video ',LoadedImages[imgctr]);
        writeRotateDeleteError(null, null, 'cannot resize video ',LoadedImagesData[imgctr].FilePath);
        videoElement.setAttribute('style', `
            position: absolute;
            z-index: 5;
            max-width: 100%;
            max-height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100vw;
            height: 100vh;
        `);
    }
}


