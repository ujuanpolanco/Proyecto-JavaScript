/**
 * <toast-message>: avisos breves ("Tarea creada", "3 tareas importadas").
 * Responsable: Juan
 *
 * Uso: toast.show('Tarea creada', 'success')
 * Tipos: 'success' | 'error' | 'info'
 */
import { baseCss } from './shared-styles.js';
import { icons } from './icons.js';

const DURACION = 3500; // milisegundos que se ve cada aviso

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    :host {
      position: fixed; right: 1rem; bottom: 1rem; z-index: 100;
      max-width: min(420px, calc(100vw - 2rem)); pointer-events: none;
    }
    .region { display: grid; justify-items: end; gap: .5rem; }
    .toast {
      display: flex; align-items: center; gap: .625rem; pointer-events: auto;
      padding: .75rem .75rem .75rem 1rem; border-radius: var(--radius-md);
      background: var(--color-toast-bg); color: var(--color-toast-text);
      box-shadow: var(--shadow-lg); font-weight: 500;
      animation: toast-in .2s ease-out;
    }
    .toast > svg { width: 1.25rem; height: 1.25rem; flex: none; }
    .toast--success > svg { color: var(--color-toast-success); }
    .toast--error > svg { color: var(--color-toast-error); }
    .toast--info > svg { color: var(--color-toast-info); }
    .toast .btn { min-height: 2rem; width: 2rem; color: inherit; }
    .toast .btn svg { width: 1rem; height: 1rem; }

    @media (max-width: 560px) { :host { left: 1rem; } .region { justify-items: stretch; } }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } }
  </style>
  <!-- aria-live: el lector de pantalla anuncia los avisos nuevos. -->
  <div class="region" role="status" aria-live="polite"></div>
`;

const ICONS = { success: icons.check, error: icons.alert, info: icons.info };

class ToastMessage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `${ICONS[type]}<span></span>
      <button class="btn btn--ghost icon-btn" type="button" aria-label="Cerrar aviso">${icons.close}</button>`;
    toast.querySelector('span').textContent = message; // textContent: el mensaje puede traer texto del usuario
    toast.querySelector('button').addEventListener('click', () => toast.remove());

    this.shadowRoot.querySelector('.region').append(toast);
    setTimeout(() => toast.remove(), DURACION);
  }
}

customElements.define('toast-message', ToastMessage);
