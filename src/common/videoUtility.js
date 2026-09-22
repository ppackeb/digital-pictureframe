
//https://cwestblog.com/2017/05/03/javascript-snippet-get-video-frame-as-an-image/
/*

this fuction returns an image from the video

This getVideoImage(blob, secs, callback) function takes three arguments:

blob {Blob}:
The video Blob from which to capture a frame.

secs {number | function(duration): number}:
If this is a non-negative number this will indicate the time of the frame to capture in seconds. 
If this is a negative number this will indicate the time of the frame from the end of the video to capture in seconds. 
If this is a function it will be passed the duration as a number and the return value should be a number (positive or negative) which indicates the time of the frame that should be captured.

callback {function(img, event)}:
The function which is called either after loading the frame’s image successfully or after getting an error. 
The first argument passed will be the Image object that is created (if no error occurred). 
The third argument will either be a seeked event or an error event.
*/


function getVideoImage(blob, secs, callback) {
  var me = this;
  var video = document.createElement('video');
  var blobUrl = URL.createObjectURL(blob);
  var finished = false;

  function finish(event, img) {
    if (finished) return;
    finished = true;
    video.pause();
    video.removeAttribute('src');
    video.load();
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // ignore cleanup errors; blob URL is already invalid or already revoked
    }
    callback.call(me, img, event);
  }

  video.src = blobUrl;

  video.onloadedmetadata = function() {
    try {
      if (typeof secs === 'function') {
        secs = secs(this.duration);
      }
      this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration);
    } catch (err) {
      finish({ type: 'error', error: err }, undefined);
    }
  };
  
  video.onseeked = async function(e) {
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      var width = video.videoWidth;
      var height = video.videoHeight;
      var maxDimension = 1280;
      var scale = Math.min(1, maxDimension / Math.max(width, height));

      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);

      if (height > width) {
        canvas.height = Math.round(width * scale);
        canvas.width = Math.round(height * scale);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      var imageBlob = await new Promise(function(resolve, reject) {
        canvas.toBlob(function(blob) {
          if (!blob) {
            reject(new Error('Could not encode video frame'));
            return;
          }
          resolve(blob);
        });
      });

      var dataUrl = await new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
          resolve(reader.result);
        };
        reader.onerror = function(error) {
          reject(error || new Error('Could not read image blob'));
        };
        reader.readAsDataURL(imageBlob);
      });

      var img = new Image();
      img.src = dataUrl;
      finish(e, img);
    } catch (err) {
      finish({ type: 'error', error: err }, undefined);
    }
  };
  
  video.onerror = function(e) {
    finish(e, undefined);
  };
}
