

/**
 * Sends a POST request to the server and returns the response data.
 * @param {string} url - The URL to send the request to.
 * @param {object} payload - The data to send in the request body.
 * @returns {Promise<any>} A promise that resolves with the parsed JSON response.
 */
async function makeRequest(url, payload) {
    // Generate a unique ID for this specific request
    const request_id = Date.now().toString() + Math.random().toString(36).substring(2);

    // Combine payload and unique ID
    const fullPayload = { ...payload, request_id: request_id };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fullPayload) // Stringify the payload for the request body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data; // Returns the parsed JSON data
        
    } catch (error) {        
        throw error; // Re-throw the error to be handled by the caller
    }
}


async function PrepMessage(command, payload=null){  
  messagePayload = null;    
  switch (command){  
    case "DeletePlaylist":        
      messagePayload = {command: command, data: payload};        
    break;
    case "NewPlaylist":      
      messagePayload = {command: command, data: payload};     
    break;
    case "app_readDB":      
      messagePayload = {command: command, data: payload };
    break;
    case 'app_writeDB':      
        messagePayload = { command: command, data: payload };
    break;
    case 'AppGetCurrentDisplayImageData':
      messagePayload = { command: command, data: payload };
    break; 
    case 'AppSaveEXIFData':
      messagePayload = {command: command, data: payload};
    break;
    case 'GetMutePlayState':
      messagePayload = { command: command, data: payload };
    break;
    case 'direction':
      messagePayload = { command: command, data: payload };
    break;
    case 'filectrl':
      messagePayload = { command: command, data: payload };
    break;
    case 'information':
      messagePayload = { command: command, data: payload };
    break;
    case 'volume':
      messagePayload = { command: command, data: payload };
    break;
    case 'DeleteMarkedFilesList':    
      messagePayload = { command: command, data: payload };              
    break;
    case 'readMarkedFileList':
      messagePayload = { command: command, data: payload };
    break;
    case 'GethideImagesState':
      messagePayload = { command: command, data: payload };
    break;  
    case 'appSetHideShowImages':      
      messagePayload = {command: command, data: payload}; 
    break;
    case 'refresh':      
      messagePayload = {command: command, data: payload};                
    break; 
    case 'appRebuildAll':       
      messagePayload = {command: command, data: payload};             
    break;
    case 'app_getQRCode':
      messagePayload = {command: command, data: payload};  
    break;
    case 'ZoomImage':
      messagePayload = {command: command, data: payload};        
    break;    
  }  
  try {
    // Await the response from the new, async makeRequest function.
    returnData = await makeRequest("/app_sendrequest", messagePayload);
    console.log(returnData);
    return returnData.data;  
  } catch (error) {        
    // do nothing
  } 
}