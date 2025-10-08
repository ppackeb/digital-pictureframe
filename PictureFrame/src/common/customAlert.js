(function () {
  // Inject HTML
  const modalHtml = `
    <div id="modalBackdrop" style="display:none; position:fixed; top:0; left:0;
      width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:999;">
    </div>
    <div id="customAlert" style="display:none; position:fixed; top:30%; left:50%;
      transform:translate(-50%, -50%); background:white; border:1px solid #888;
      padding:20px; z-index:1000; box-shadow:2px 2px 10px gray; 
      max-width: 400px; text-align: center; border-radius: 8px;">
      <p id="customAlertMessage" style="margin-bottom: 20px; text-align: center; white-space: pre-wrap;"></p>
      <div style="display: flex; justify-content: center; gap: 10px;">
        <button id="okBtn">OK</button>
        <button id="cancelBtn">Cancel</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Functions
  window.ShowAlert = function (message, showCancel = true) {
    return new Promise((resolve) => {
      document.getElementById('customAlertMessage').innerText = message;
      document.getElementById('customAlert').style.display = 'block';
      document.getElementById('modalBackdrop').style.display = 'block';

      const cancelBtn = document.getElementById('cancelBtn');
      cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

      document.getElementById('okBtn').onclick = () => {
        CloseAlert();
        resolve("ok");
      };

      cancelBtn.onclick = () => {
        CloseAlert();
        resolve("cancel");
      };
    });
  };

  window.CloseAlert = function () {
    document.getElementById('customAlert').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
  };
})();
