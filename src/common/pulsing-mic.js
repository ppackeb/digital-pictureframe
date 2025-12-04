/**
 * PulsingMic Web Component
 * Usage in HTML:
 *   <script src="pulsing-mic.js"></script>
 *   <pulsing-mic></pulsing-mic>
 * 
 * Control via JavaScript:
 *   document.querySelector('pulsing-mic').show();
 *   document.querySelector('pulsing-mic').hide();
 *   document.querySelector('pulsing-mic').toggle();
 */

class PulsingMic extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --size: 60px;
          --mid-blue: #2563eb;
          --light-blue: #93c5fd;
          --duration: 1.8s;
          --scale: 2.6;
        }

        .wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          position: fixed;
          bottom: 20px;
          right: 68px;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 22;
        }

        .wrap.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .pulse {
          width: var(--size);
          height: var(--size);
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(
            circle at 40% 30%,
            var(--mid-blue) 0%,
            color-mix(in srgb, var(--mid-blue) 60%, white 15%) 55%,
            var(--light-blue) 100%
          );
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.18), inset 0 2px 6px rgba(255, 255, 255, 0.06);
          z-index: 20;
        }

        .pulse img {
          z-index: 30;
          width: auto;
          height: 45px;
        }

        .pulse::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%) scale(1);
          border-radius: 50%;
          z-index: 20;
          background: radial-gradient(
            circle,
            rgba(147, 197, 253, 0.9) 0%,
            rgba(147, 197, 253, 0.6) 40%,
            rgba(147, 197, 253, 0.25) 60%,
            rgba(147, 197, 253, 0) 70%
          );
          animation: ripple var(--duration) ease-out infinite;
          pointer-events: none;
        }

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 0.65;
          }
          100% {
            transform: translate(-50%, -50%) scale(var(--scale));
            opacity: 0;
          }
        }
      </style>

      <div class="wrap hidden">
        <div class="pulse" aria-hidden="true">
          <img src="../renderer/assets/images/mic-blue.png" alt="Microphone Icon" />          
        </div>
      </div>
    `;
  }

  show() {
    const wrap = this.shadowRoot.querySelector('.wrap');
    wrap.classList.remove('hidden');
  }

  hide() {
    const wrap = this.shadowRoot.querySelector('.wrap');
    wrap.classList.add('hidden');
  }

  toggle() {
    const wrap = this.shadowRoot.querySelector('.wrap');
    wrap.classList.toggle('hidden');
  }

  isVisible() {
    const wrap = this.shadowRoot.querySelector('.wrap');
    return !wrap.classList.contains('hidden');
  }
}

customElements.define('pulsing-mic', PulsingMic);


