
//https://cwestblog.com/2017/05/03/javascript-snippet-get-video-frame-as-an-image/
/*

this fuction returns an image from the video

This getVideoImage(path, secs, callback) function takes three arguments:

path {string}:
The path to the video. In the case that you are using this code in a web page this must be a video within the same domain.

secs {number | function(duration): number}:
If this is a non-negative number this will indicate the time of the frame to capture in seconds. 
If this is a negative number this will indicate the time of the frame from the end of the video to capture in seconds. 
If this is a function it will be passed the duration as a number and the return value should be a number (positive or negative) which indicates the time of the frame that should be captured.

callback {function(img, event)}:
The function which is called either after loading the frame’s image successfully or after getting an error. 
The first argument passed will be the Image object that is created (if no error occurred). 
The third argument will either be a seeked event or an error event.
*/


function getVideoImage(base64Data, secs, callback) {
  var me = this;
  var video = document.createElement('video');
  
  // Prepend base64 data with the MIME type
  video.src = base64Data;

  video.onloadedmetadata = function() {
    if (typeof secs === 'function') {
      secs = secs(this.duration);
    }
    this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration);
  };
  
  video.onseeked = function(e) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    
    if (canvas.height > canvas.width) {
      canvas.height = video.videoWidth;
      canvas.width = video.videoHeight;
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    var img = new Image();
    img.src = canvas.toDataURL();
    
    callback.call(me, img, e);
  };
  
  video.onerror = function(e) {
    callback.call(me, undefined, e);
  };
}
