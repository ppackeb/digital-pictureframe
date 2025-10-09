

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
