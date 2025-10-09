(function () {
  // Inject HTML + CSS
  const modalHtml = `
    <style>
      /* Backdrop */
      #modalBackdrop {
        display: none;
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 999;
      }

      /* Popup container */
      #customAlert {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #888;
        padding: 10px;
        z-index: 1000;
        box-shadow: 2px 2px 10px gray;
        border-radius: 8px;
        text-align: center;

        width: 90%;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;   /* vertical scroll if needed */
        overflow-x: hidden; /* no horizontal scroll */
      }

      /* Message text */
      #customAlertMessage {
        margin-bottom: 20px;
        text-align: center;
        white-space: pre-wrap; /* keep line breaks */
      }

      /* Button row */
      #customAlert div {
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap; /* wrap buttons on very narrow screens */
      }

      #customAlert button {
        min-width: 60px;
        padding: 6px 12px;
      }
    </style>

    <div id="modalBackdrop"></div>
    <div id="customAlert">
      <p id="customAlertMessage"></p>
      <div>
        <button id="okBtn">OK</button>
        <button id="cancelBtn">Cancel</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Functions
  window.ShowAlert = function (message, showCancel = true) {
    return new Promise((resolve) => {
      const alertMessage = document.getElementById('customAlertMessage');
      const customAlert = document.getElementById('customAlert');
      const modalBackdrop = document.getElementById('modalBackdrop');
      const cancelBtn = document.getElementById('cancelBtn');
      const okBtn = document.getElementById('okBtn');

      alertMessage.innerText = message;
      customAlert.style.display = 'block';
      modalBackdrop.style.display = 'block';

      cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

      okBtn.onclick = () => {
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
