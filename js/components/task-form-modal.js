/**
 * <task-form-modal>: formulario para crear o editar una tarea.
 * Responsable: Juan
 *
 * Uso: form.open() para crear, form.open(tarea) para editar, form.close(), form.showErrors(errores)
 * Emite: SAVE { id, data: { title, description, createdAt, completed } }
 *   - La descripción solo se puede escribir al crear; al editar se muestra bloqueada.
 *   - id null → crear tarea
 *   - con id  → editar tarea
 */
import { baseCss, dialogCss } from './shared-styles.js';
import { icons } from './icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { closeOnBackdrop } from '../utils/dom.js';
import { DESCRIPTION_MAX, TITLE_MAX, todayISO, validateTaskInput } from '../models/task.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    ${dialogCss}
    /* Cada campo del formulario: etiqueta, caja y mensaje */
    .field { display: grid; gap: .375rem; margin-bottom: 1.125rem; }
    /* Etiquetas de los campos en negrita */
    label { font-weight: 600; font-size: .9375rem; }
    /* Asterisco rojo de campo obligatorio */
    .req { color: var(--color-danger); }
    /* Cajas de texto, de fecha y de descripción */
    input[type="text"], input[type="date"], textarea {
      width: 100%; min-height: 2.75rem; padding: .5rem .75rem;
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      background: var(--color-surface); color: inherit; font: inherit;
    }
    /* DESCRIPCIÓN: caja de varias líneas que se puede agrandar hacia abajo */
    textarea { min-height: 5.5rem; resize: vertical; line-height: 1.45; }
    /* Descripción bloqueada (al editar): fondo gris y sin cursor de escritura */
    textarea[readonly] { background: var(--color-surface-muted); color: var(--color-text-muted); cursor: not-allowed; }
    /* Si el campo tiene error, el borde se pone rojo */
    input[aria-invalid="true"], textarea[aria-invalid="true"] { border-color: var(--color-danger); }
    /* Ayuda debajo del título y contador de caracteres */
    .hint { display: flex; justify-content: space-between; gap: 1rem; font-size: .8125rem; color: var(--color-text-muted); }
    /* Mensaje de error en rojo debajo del campo; se oculta si está vacío */
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

  <!-- Ventana del formulario -->
  <dialog aria-labelledby="form-title">
    <form novalidate>
      <!-- Encabezado: título de la ventana y botón cerrar -->
      <header class="dialog__header">
        <div>
          <h2 class="dialog__title" id="form-title">Nueva tarea</h2>
          <p class="dialog__subtitle" id="form-subtitle">Los campos con * son obligatorios.</p>
        </div>
        <button class="btn btn--ghost icon-btn" type="button" id="btn-close" aria-label="Cerrar">${icons.close}</button>
      </header>

      <!-- Cuerpo: los campos del formulario -->
      <div class="dialog__body">
        <div class="field">
          <!-- Campo TÍTULO -->
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
          <!-- Campo DESCRIPCIÓN (opcional; solo se escribe al crear la tarea) -->
          <label for="description">Descripción</label>
          <textarea id="description" maxlength="${DESCRIPTION_MAX}" rows="3"
            placeholder="Ej.: Se pagó el arriendo de noviembre" aria-describedby="description-hint description-error"></textarea>
          <div class="hint">
            <span id="description-hint">Opcional. Detalles de la tarea.</span>
            <span id="description-counter">0/${DESCRIPTION_MAX}</span>
          </div>
          <p class="error" id="description-error" role="alert"></p>
        </div>

        <div class="field">
          <!-- Campo FECHA DE REGISTRO -->
          <label for="createdAt">Fecha de registro <span class="req">*</span></label>
          <input id="createdAt" type="date" aria-describedby="createdAt-error">
          <p class="error" id="createdAt-error" role="alert"></p>
        </div>

        <!-- Interruptor COMPLETADA -->
        <label class="switch" for="completed">
          <span>Completada<small>Activa esta opción si la tarea ya está terminada.</small></span>
          <input id="completed" type="checkbox">
        </label>
      </div>

      <!-- Botones Cancelar y Guardar -->
      <footer class="dialog__footer">
        <button class="btn" type="button" id="btn-cancel">Cancelar</button>
        <button class="btn btn--primary" type="submit" id="btn-submit">Guardar tarea</button>
      </footer>
    </form>
  </dialog>
`;

// Clase del componente <task-form-modal>
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
    // La X y Cancelar cierran la ventana sin guardar
    root.getElementById('btn-close').addEventListener('click', () => this.close());
    root.getElementById('btn-cancel').addEventListener('click', () => this.close());
    closeOnBackdrop(root.querySelector('dialog'), () => this.close());

    // Al escribir se actualiza el contador y se borra el error del campo.
    root.getElementById('title').addEventListener('input', () => {
      this.#updateCounter();
      this.#setError('title', '');
    });
    root.getElementById('createdAt').addEventListener('input', () => this.#setError('createdAt', ''));
    // Al escribir la descripción se actualiza su contador y se borra su error
    root.getElementById('description').addEventListener('input', () => {
      this.#updateCounter();
      this.#setError('description', '');
    });
  }

  /** Sin tarea abre el modo "crear"; con tarea, el modo "editar". */
  open(task = null) {
    const root = this.shadowRoot;
    const isEdit = task !== null;
    this.#editingId = isEdit ? task.id : null;

    // Cambia los textos según sea crear o editar
    root.getElementById('form-title').textContent = isEdit ? 'Editar tarea' : 'Nueva tarea';
    root.getElementById('form-subtitle').textContent = isEdit
      ? `ID ${task.id} · Los campos con * son obligatorios.`
      : 'Los campos con * son obligatorios.';
    root.getElementById('btn-submit').textContent = isEdit ? 'Guardar cambios' : 'Guardar tarea';

    // Llena los campos: vacíos al crear o con los datos de la tarea al editar
    root.getElementById('title').value = isEdit ? task.title : '';
    // Descripción: se escribe al crear; al editar se muestra pero queda bloqueada (readOnly)
    const description = root.getElementById('description');
    description.value = isEdit ? (task.description ?? '') : '';
    description.readOnly = isEdit;
    root.getElementById('description-hint').textContent = isEdit
      ? 'La descripción solo se puede escribir al crear la tarea.'
      : 'Opcional. Detalles de la tarea.';
    root.getElementById('createdAt').value = isEdit ? task.createdAt : todayISO();
    root.getElementById('createdAt').max = todayISO(); // el calendario no deja elegir fechas futuras
    root.getElementById('completed').checked = isEdit ? task.completed : false;
    this.#setError('title', '');
    this.#setError('createdAt', '');
    this.#setError('description', '');
    this.#updateCounter();

    // Abre la ventana y pone el cursor en el título
    root.querySelector('dialog').showModal();
    root.getElementById('title').focus();
  }

  // Cierra la ventana
  close() {
    this.shadowRoot.querySelector('dialog').close();
  }

  /** Muestra los errores de validación y pone el foco en el primer campo con error. */
  showErrors(errors) {
    this.#setError('title', errors.title ?? '');
    this.#setError('createdAt', errors.createdAt ?? '');
    this.#setError('description', errors.description ?? '');
    if (errors.title) this.shadowRoot.getElementById('title').focus();
    else if (errors.description) this.shadowRoot.getElementById('description').focus();
    else if (errors.createdAt) this.shadowRoot.getElementById('createdAt').focus();
  }

  // Al pulsar Guardar: lee los campos, valida y envía el evento SAVE
  #submit() {
    const root = this.shadowRoot;
    const data = {
      title: root.getElementById('title').value.trim(),
      description: root.getElementById('description').value.trim(),
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

  /** field es 'title', 'description' o 'createdAt'. Con mensaje vacío se borra el error. */
  #setError(field, message) {
    const root = this.shadowRoot;
    const error = root.getElementById(`${field}-error`);
    error.innerHTML = message ? `${icons.alert}<span></span>` : '';
    if (message) error.querySelector('span').textContent = message;
    root.getElementById(field).setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  // Actualiza los contadores de caracteres del título (ej.: 12/120) y de la descripción
  #updateCounter() {
    const length = this.shadowRoot.getElementById('title').value.length;
    this.shadowRoot.getElementById('counter').textContent = `${length}/${TITLE_MAX}`;
    const descLength = this.shadowRoot.getElementById('description').value.length;
    this.shadowRoot.getElementById('description-counter').textContent = `${descLength}/${DESCRIPTION_MAX}`;
  }
}

// Registra la etiqueta <task-form-modal>
customElements.define('task-form-modal', TaskFormModal);
