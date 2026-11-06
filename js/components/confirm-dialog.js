/**
 * <confirm-dialog>: confirmación reutilizable (eliminar, vaciar, marcar terminadas).
 * Responsable: Juan
 *
 * Uso (con un callback que solo se ejecuta si el usuario confirma):
 *   confirmDialog.ask({
 *     title: '¿Eliminar tarea?',
 *     message: '...',
 *     confirmText: 'Eliminar',
 *     tone: 'danger',              // 'danger' pinta el botón en rojo
 *     onConfirm: () => { ... },
 *   });
 */
import { baseCss, dialogCss } from './shared-styles.js';
import { icons } from './icons.js';
import { closeOnBackdrop } from '../utils/dom.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    ${dialogCss}
    @media (min-width: 561px) { dialog { width: 440px; } } /* en celular se usa el ancho completo */
    .content { display: flex; gap: 1rem; align-items: flex-start; padding: 1.5rem 1.5rem .75rem; }
    .icon {
      display: grid; place-items: center; flex: none; width: 2.75rem; height: 2.75rem; border-radius: 50%;
      background: var(--color-primary-soft); color: var(--color-primary);
    }
    .icon svg { width: 1.375rem; height: 1.375rem; }
    .is-danger .icon { background: var(--color-danger-soft); color: var(--color-danger); }
    .message { margin: .375rem 0 0; color: var(--color-text-muted); }
    .dialog__footer { border-top: 0; padding-top: .75rem; }
  </style>

  <dialog aria-labelledby="confirm-title" aria-describedby="confirm-message">
    <div class="content">
      <span class="icon">${icons.alert}</span>
      <div>
        <h2 class="dialog__title" id="confirm-title"></h2>
        <p class="message" id="confirm-message"></p>
      </div>
    </div>
    <footer class="dialog__footer">
      <button class="btn" type="button" id="btn-cancel">Cancelar</button>
      <button class="btn btn--primary" type="button" id="btn-confirm"></button>
    </footer>
  </dialog>
`;

class ConfirmDialog extends HTMLElement {
  #onConfirm = null; // función que se ejecuta si el usuario confirma

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    const dialog = root.querySelector('dialog');
    root.getElementById('btn-cancel').addEventListener('click', () => dialog.close());
    closeOnBackdrop(dialog, () => dialog.close());

    root.getElementById('btn-confirm').addEventListener('click', () => {
      const action = this.#onConfirm;
      dialog.close();
      if (action) action();
    });

    // Al cerrarse (por botón, Esc o clic afuera) se olvida la acción pendiente.
    dialog.addEventListener('close', () => {
      this.#onConfirm = null;
    });
  }

  ask({ title, message, confirmText = 'Confirmar', tone = 'primary', onConfirm }) {
    const root = this.shadowRoot;
    const danger = tone === 'danger';
    const confirmBtn = root.getElementById('btn-confirm');

    root.getElementById('confirm-title').textContent = title;
    root.getElementById('confirm-message').textContent = message;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = danger ? 'btn btn--danger-solid' : 'btn btn--primary';
    root.querySelector('.content').classList.toggle('is-danger', danger);

    this.#onConfirm = onConfirm;
    root.querySelector('dialog').showModal();
    // En acciones peligrosas el foco empieza en "Cancelar", para no borrar por accidente con Enter.
    if (danger) root.getElementById('btn-cancel').focus();
    else confirmBtn.focus();
  }
}

customElements.define('confirm-dialog', ConfirmDialog);
