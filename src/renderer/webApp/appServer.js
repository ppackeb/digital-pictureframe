

/*
 * Sends a POST request to the server and returns the response data.
 */

//async function makeRequest(url, payload) {
async function PrepMessage(command, payload=null){  
  let messagePayload = null;    
  let url = "/app_sendrequest";
  messagePayload = {command: command, data: payload}; 
  
  // Generate a unique ID for this specific request
  const request_id = Date.now().toString() + Math.random().toString(36).substring(2);

  // Combine payload and unique ID
  const fullPayload = { ...messagePayload, request_id: request_id };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fullPayload) // Stringify the payload for the request body
    });

    if (!response.ok) {
      // do nothing as caller will handle timeout or error
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.data; // Returns the parsed JSON data
      
  } catch (error) {        
    throw error; // Re-throw the error to be handled by the caller
  }
}