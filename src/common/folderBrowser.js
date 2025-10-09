/*
folderBrowser.js requires cutomAlerts.js for ShowAlert function and appServer.js to
communicate with main.js.   customAlerts.js and appServer.js should be included in 
the calling html file before folderBrowser.js
<script type='text/javascript' src='appServer.js'></script>
<script src="../../common/customAlert.js"></script> 
<script src="folderBrowser.js"></script>
*/

(function () {
  // Inject CSS for the modal
  const css = `
/* Modal Container */
.modal {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 325px;
  min-height: 400px;
  max-height: 400px;
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 15px;
  padding: 1.3rem;
  overflow: hidden;
  z-index: 2;
}
/* Modal Flex Row */
.modal .flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
/* Modal Inputs */
.modal input {
  padding: 0.7rem 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 0.9em;
}
/* Hide Element Utility */
.hidden {
  display: none;
}
/* Modal Table Scroll Area */
#table-scroll2 {
  flex: 1 1 auto;
  overflow-y: auto;
  max-height: 300px;
  margin-top: 10px;
}
/* Modal Bottom Buttons */
.modal-bottom-buttons {
  position: absolute;
  bottom: 10px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60px;
  z-index: 1000;    
}
.modal-bottom-buttons button {
  font-size: 20px;
  width: 75px;
  height: 40px;  
}

.full-width-input {
  width: 100%;
  box-sizing: border-box;
}

/* Modal Table */
#dir_table {
  width: 100%;
}
tr.grey th {
  background-color: white;
}

/* Modal Overlay */
.overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  z-index: 1;
}  
  `;
  
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Inject HTML for the modal
  const modalHtml = `
  <section class="modal hidden" id="folderBrowserModal">
    <div class="flex">
      <input type="text" id="dirPath" name="dirPath" class="full-width-input">
      <input type="image" id="FolderTableInfo" name="FolderTableInfo" src="../renderer/assets/images/app help.png" style="height:20px; border: none;">
    </div>
    <div id="table-scroll2">
      <table id="dir_table">
        <tr class="grey">
          <th>Folders</th>
        </tr>
        <tbody></tbody>
      </table>
    </div>
    <div class="modal-bottom-buttons">
      <button id="btn-submit">OK</button>
      <button id="btn-close">Cancel</button>
      <button id="btn-back">Back</button>
    </div>
  </section>
  <div class="overlay hidden" id="folderBrowserOverlay"></div>
  `;
  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  document.body.appendChild(container);

  // Modal JS logic
  let SubLevelDir = []; // used to store directories for back button in modal
  let SystemDirs = [];  // store system directories for use in double click 
  let SubDir = null; // used to store the next directory to load when double clicked
  let folderBrowserCallback = null;

  const closeModalBtn = document.getElementById("btn-close");
  const closeModalSubmit = document.getElementById("btn-submit");
  const backModalBtn = document.getElementById("btn-back");
  const modal = document.getElementById("folderBrowserModal");
  const overlay = document.getElementById("folderBrowserOverlay");
  const dirInput = document.getElementById('dirPath');
  const modalSection = modal;

  closeModalSubmit.addEventListener("click", closeModalSubmitted);
  closeModalBtn.addEventListener("click", closeModalCancel);
  backModalBtn.addEventListener("click", backModalClicked);


  async function PrepMessage(payload){  
    messagePayload = null;    
    switch (payload){        
      case 'TopImageDir':
        messagePayload = {command:"ImageDir", data:"TopDir" };
      break;
      case 'SubImageDir':      
        messagePayload = {command: "ImageDir",data: SubDir};
      break;
    }  
    try {
      // Await the response from the new, async makeRequest function.
      returnData = await makeRequest('/app_sendrequest', messagePayload);
      command = returnData.command;
      data = returnData.data;
      // Handle the response based on the command.
      switch(messagePayload.command){        
        case 'ImageDir':
          return data.data;
        break;        
        
        default:          
        break;
      }      
    } catch (error) {        
      //ShowAlert('Error in html POST. '+ error, false).then((result) => {                  
      // })  
    } 
  }

  // Help button calls showAlert from customAlerts.js
  document.getElementById("FolderTableInfo").onclick = function() {
    ShowAlert('Type the folder path directly or click the folder path to progress in the hierarchy to find the desired folder. Click "OK" to select the folder. Use "Back" to move up the current folder hierarchy path. Use "Cancel" to exit without selecting a folder.', false).then(() => {       
    });       
  };


  async function openModal(callback) {
    folderBrowserCallback = callback;
    closeModalBtn.disabled = false;
    closeModalSubmit.disabled = false;
    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");
    let returnData = await PrepMessage('TopImageDir');
    PopDirTable(returnData);
  }

  function closeModalCancel() {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
    // Optionally, you can add a callback or event here
  }

function closeModalSubmitted() {
  const selectedDir = document.getElementById('dirPath').value;
  closeModalBtn.disabled = true;
  closeModalSubmit.disabled = true;
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
  if (typeof folderBrowserCallback === "function") {
    folderBrowserCallback(selectedDir);
    folderBrowserCallback = null; // clear after use
  }
}

  async function backModalClicked() {
    if (SubLevelDir.length > 0) {
      SubDir = SubLevelDir.pop();
      let result = await PrepMessage('SubImageDir');
      if (result !== 'bad dir') {
        PopDirTable(result);
        document.getElementById('btn-submit').disabled = false;
      } else {
        ShowAlert('Invalid Directory', false).then(() => {       
          });             
        document.getElementById('btn-submit').disabled = true;
      }
    } else {
      let result = await PrepMessage('TopImageDir');
      PopDirTable(result);
    }
  }


  async function handleDirInput() {
    SubDir = dirInput.value;
    let result = await PrepMessage('SubImageDir');
    if (result !== 'bad dir') {
      PopDirTable(result);
      document.getElementById('btn-submit').disabled = false;
    } else {
      ShowAlert('Invalid Directory', false).then(() => {       
        });   
      document.getElementById('btn-submit').disabled = true;
    }
  }

  dirInput.addEventListener('keypress', async function (e) {
    if (e.key === "Enter") {
      await handleDirInput();
    }
  });

  dirInput.addEventListener('blur', async function () {
    await handleDirInput();
  });

  function PopDirTable(SystemDirectories) {
    SystemDirs = SystemDirectories;
    document.getElementById('dirPath').value = SystemDirectories[0] || "";
    const dirTableBody = document.getElementById('dir_table').getElementsByTagName('tbody')[0];
    dirTableBody.innerHTML = '';
    SystemDirectories.forEach((data, index) => {
      if (index !== 0) {
        const LastSlashIndex = data.lastIndexOf('\\');
        const LastDir = data.slice(LastSlashIndex);
        const newRow = dirTableBody.insertRow();
        newRow.innerHTML = `<td>${LastDir}</td>`;
      }
    });
  }

  document.getElementById('dir_table').addEventListener('click', async function (e) {
    if (e.target.tagName === 'TD') {
      document.getElementById('btn-submit').disabled = false;
      let row = e.target.parentElement.rowIndex;
      SubDir = SystemDirs[row + 1];
      SubLevelDir.push(SystemDirs[0]);
      let returnData = await PrepMessage('SubImageDir');
      PopDirTable(returnData);
    }
  });

  // Expose openModal globally
  window.openModal = openModal;
})();