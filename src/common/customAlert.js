(function () {
  // ===== Inject HTML + CSS =====
  const modalHtml = `
    <style>
      /* ===== Custom Alert Styles ===== */

      #modalBackdrop {
        display: none;
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 999;
      }

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
        border-radius: 6px;
        text-align: center;
        width: 90%;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
        overflow-x: hidden;
      }

      #customAlertMessage {
        margin-bottom: 20px;
        text-align: center;
        white-space: pre-wrap;
      }

      #customAlert div {
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      #customAlert button {
        min-width: 60px;
        padding: 6px 12px;
      }

      /* ===== Saving Modal Styles ===== */
      #modalSavingCombined {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 999;
        align-items: center;
        justify-content: center;
      }

      #modalSavingCombined .modal-content {
        background: white;
        border: 1px solid #888;  
        box-shadow: 2px 2px 1vw gray;
        width: 90%;
        max-width: 70vw;
        height: clamp(10vh, 30vh, 80vh);
        overflow-y: auto;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        padding: 1rem;
      }

      .modal-content img {
        height: 2em;
        width: auto;
        vertical-align: middle;
        margin-left: 2rem;
      }
    </style>

    <!-- Custom Alert -->
    <div id="modalBackdrop"></div>
    <div id="customAlert">
      <p id="customAlertMessage"></p>
      <div>
        <button id="okBtn">OK</button>
        <button id="cancelBtn">Cancel</button>
      </div>
    </div>

    <!-- Saving Modal -->
    <section id="modalSavingCombined">    
      <div class="modal-content">
        <span id="savingMessage">Building Playlist</span>
        <img src="../renderer/assets/images/copyfiles.png" alt="loading">
      </div>
    </section>
  `;

  // Add to DOM
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // ===== Custom Alert Functions =====
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

  // ===== Saving Modal Functions =====
  window.ShowSavingModal = function (show = true, message = "Building Playlist") {
    const modal = document.getElementById("modalSavingCombined");
    const text = document.getElementById("savingMessage");
    if (!modal) return;

    if (show) {
      text.textContent = message;
      modal.style.display = "flex";
    } else {
      modal.style.display = "none";
    }
  };
})();
