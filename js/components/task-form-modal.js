/**
 * <task-form-modal>: formulario para crear o editar una tarea.
 * Responsable: Juan
 *
 * Uso: form.open() para crear, form.open(tarea) para editar, form.close(), form.showErrors(errores)
 * Emite: SAVE { id, data: { title, createdAt, completed } }
 *   - id null → crear tarea
 *   - con id  → editar tarea
 */
import { baseCss, dialogCss } from './shared-styles.js';
import { icons } from './icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { closeOnBackdrop } from '../utils/dom.js';
import { TITLE_MAX, todayISO, validateTaskInput } from '../models/task.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    ${dialogCss}
    .field { display: grid; gap: .375rem; margin-bottom: 1.125rem; }
    label { font-weight: 600; font-size: .9375rem; }
    .req { color: var(--color-danger); }
    input[type="text"], input[type="date"] {
      width: 100%; min-height: 2.75rem; padding: .5rem .75rem;
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      background: var(--color-surface); color: inherit; font: inherit;
    }
    input[aria-invalid="true"] { border-color: var(--color-danger); }
    .hint { display: flex; justify-content: space-between; gap: 1rem; font-size: .8125rem; color: var(--color-text-muted); }
    .error { display: flex; gap: .375rem; align-items: center; margin: 0; font-size: .8125rem; font-weight: 600; color: var(--color-danger); }
    .error:empty { display: none; }
    .error svg { width: 1rem; height: 1rem; flex: none; }

    /* Interruptor "Completada": es un checkbox con forma de switch. */
    .switch {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: .75rem 1rem; cursor: pointer;
      background: var(--color-surface-muted); border: 1px solid var(--color-border); border-radius: var(--radius-md);
    }
    .switch small { display: block; font-weight: 400; color: var(--color-text-muted); }
    .switch input {
      appearance: none; position: relative; flex: none; margin: 0; cursor: pointer;
      width: 2.75rem; height: 1.5rem; border-radius: 999px; background: var(--color-border-strong);
    }
    .switch input::after {
      content: ""; position: absolute; top: 3px; left: 3px;
      width: 1.125rem; height: 1.125rem; border-radius: 50%; background: #fff;
      box-shadow: var(--shadow-sm); transition: transform .15s;
    }
    .switch input:checked { background: var(--color-success); }
    .switch input:checked::after { transform: translateX(1.25rem); }
  </style>

  <dialog aria-labelledby="form-title">
    <form novalidate>
      <header class="dialog__header">
        <div>
          <h2 class="dialog__title" id="form-title">Nueva tarea</h2>
          <p class="dialog__subtitle" id="form-subtitle">Los campos con * son obligatorios.</p>
        </div>
        <button class="btn btn--ghost icon-btn" type="button" id="btn-close" aria-label="Cerrar">${icons.close}</button>
      </header>

      <div class="dialog__body">
        <div class="field">
          <label for="title">Título <span class="req">*</span></label>
          <input id="title" type="text" maxlength="${TITLE_MAX}" autocomplete="off"
            placeholder="Ej.: Preparar la presentación del proyecto" aria-describedby="title-error">
          <div class="hint">
            <span>Describe la tarea en pocas palabras.</span>
            <span id="counter">0/${TITLE_MAX}</span>
          </div>
          <p class="error" id="title-error" role="alert"></p>
        </div>

        <div class="field">
          <label for="createdAt">Fecha de registro <span class="req">*</span></label>
          <input id="createdAt" type="date" aria-describedby="createdAt-error">
          <p class="error" id="createdAt-error" role="alert"></p>
        </div>

        <label class="switch" for="completed">
          <span>Completada<small>Activa esta opción si la tarea ya está terminada.</small></span>
          <input id="completed" type="checkbox">
        </label>
      </div>

      <footer class="dialog__footer">
        <button class="btn" type="button" id="btn-cancel">Cancelar</button>
        <button class="btn btn--primary" type="submit" id="btn-submit">Guardar tarea</button>
      </footer>
    </form>
  </dialog>
`;

class TaskFormModal extends HTMLElement {
  #editingId = null; // null = creando una tarea nueva

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    // novalidate en el <form>: la validación la hace validateTaskInput, no el navegador.
    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault(); // evita que el formulario recargue la página
      this.#submit();
    });
    root.getElementById('btn-close').addEventListener('click', () => this.close());
    root.getElementById('btn-cancel').addEventListener('click', () => this.close());
    closeOnBackdrop(root.querySelector('dialog'), () => this.close());

    // Al escribir se actualiza el contador y se borra el error del campo.
    root.getElementById('title').addEventListener('input', () => {
      this.#updateCounter();
      this.#setError('title', '');
    });
    root.getElementById('createdAt').addEventListener('input', () => this.#setError('createdAt', ''));
  }

  /** Sin tarea abre el modo "crear"; con tarea, el modo "editar". */
  open(task = null) {
    const root = this.shadowRoot;
    const isEdit = task !== null;
    this.#editingId = isEdit ? task.id : null;

    root.getElementById('form-title').textContent = isEdit ? 'Editar tarea' : 'Nueva tarea';
    root.getElementById('form-subtitle').textContent = isEdit
      ? `ID ${task.id} · Los campos con * son obligatorios.`
      : 'Los campos con * son obligatorios.';
    root.getElementById('btn-submit').textContent = isEdit ? 'Guardar cambios' : 'Guardar tarea';

    root.getElementById('title').value = isEdit ? task.title : '';
    root.getElementById('createdAt').value = isEdit ? task.createdAt : todayISO();
    root.getElementById('createdAt').max = todayISO(); // el calendario no deja elegir fechas futuras
    root.getElementById('completed').checked = isEdit ? task.completed : false;
    this.#setError('title', '');
    this.#setError('createdAt', '');
    this.#updateCounter();

    root.querySelector('dialog').showModal();
    root.getElementById('title').focus();
  }

  close() {
    this.shadowRoot.querySelector('dialog').close();
  }

  /** Muestra los errores de validación y pone el foco en el primer campo con error. */
  showErrors(errors) {
    this.#setError('title', errors.title ?? '');
    this.#setError('createdAt', errors.createdAt ?? '');
    if (errors.title) this.shadowRoot.getElementById('title').focus();
    else if (errors.createdAt) this.shadowRoot.getElementById('createdAt').focus();
  }

  #submit() {
    const root = this.shadowRoot;
    const data = {
      title: root.getElementById('title').value.trim(),
      createdAt: root.getElementById('createdAt').value,
      completed: root.getElementById('completed').checked,
    };
    const { valid, errors } = validateTaskInput(data);
    if (!valid) {
      this.showErrors(errors);
      return;
    }
    emit(this, EVENTS.SAVE, { id: this.#editingId, data });
  }

  /** field es 'title' o 'createdAt'. Con mensaje vacío se borra el error. */
  #setError(field, message) {
    const root = this.shadowRoot;
    const error = root.getElementById(`${field}-error`);
    error.innerHTML = message ? `${icons.alert}<span></span>` : '';
    if (message) error.querySelector('span').textContent = message;
    root.getElementById(field).setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  #updateCounter() {
    const length = this.shadowRoot.getElementById('title').value.length;
    this.shadowRoot.getElementById('counter').textContent = `${length}/${TITLE_MAX}`;
  }
}

customElements.define('task-form-modal', TaskFormModal);
