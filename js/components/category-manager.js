/**
 * <category-manager>: ventana para crear, renombrar y eliminar categorías.
 *
 * Uso: manager.open(categorias, conteos), manager.update(categorias, conteos),
 *      manager.resetForm(), manager.showError(mensaje), manager.close()
 *   categorias → [{ id, name }]
 *   conteos    → Map { categoryId → cantidad de tareas }
 * Emite: CATEGORY_SAVE { id, name }  (id null → crear; con id → renombrar)
 *        CATEGORY_DELETE { id }
 *
 * La ventana no habla con el store: solo emite eventos. <task-app> guarda
 * y luego llama a update() o showError() con el resultado.
 */
import { baseCss, dialogCss } from './shared-styles.js';
import { icons } from './icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { closeOnBackdrop, escapeHTML } from '../utils/dom.js';
import { plural } from '../utils/format.js';
import { CATEGORY_NAME_MAX, validateCategoryInput } from '../models/category.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    ${dialogCss}
    /* Formulario para crear o renombrar: caja de texto + botones */
    .category-form { display: grid; gap: .375rem; margin-bottom: 1.25rem; }
    label { font-weight: 600; font-size: .9375rem; }
    .row { display: flex; flex-wrap: wrap; gap: .5rem; }
    input[type="text"] {
      flex: 1 1 220px; min-height: 2.75rem; padding: .5rem .75rem;
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      background: var(--color-surface); color: inherit; font: inherit;
    }
    input[aria-invalid="true"] { border-color: var(--color-danger); }
    .hint { font-size: .8125rem; color: var(--color-text-muted); }
    .error { display: flex; gap: .375rem; align-items: center; margin: 0; font-size: .8125rem; font-weight: 600; color: var(--color-danger); }
    .error:empty { display: none; }
    .error svg { width: 1rem; height: 1rem; flex: none; }

    /* Lista de categorías */
    h3 { margin: 0 0 .5rem; font-size: 1rem; }
    ul { list-style: none; margin: 0; padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .75rem; padding: .5rem .5rem .5rem .875rem; }
    li + li { border-top: 1px solid var(--color-border); }
    li.is-editing { background: var(--color-primary-soft); }
    li > svg { width: 1.125rem; height: 1.125rem; color: var(--color-primary); }
    .name { font-weight: 600; overflow-wrap: anywhere; }
    .count { display: block; font-size: .8125rem; font-weight: 400; color: var(--color-text-muted); }
    .actions { display: flex; gap: .25rem; }
    .actions svg { width: 1.125rem; height: 1.125rem; }
    .delete:hover:not(:disabled) { color: var(--color-danger); background: var(--color-danger-soft); }
    .empty { margin: 0; padding: 1.5rem 1rem; text-align: center; color: var(--color-text-muted); border: 2px dashed var(--color-border-strong); border-radius: var(--radius-md); }
  </style>

  <dialog aria-labelledby="categories-title">
    <header class="dialog__header">
      <div>
        <h2 class="dialog__title" id="categories-title">Categorías</h2>
        <p class="dialog__subtitle">Crea, renombra o elimina las categorías de tus tareas.</p>
      </div>
      <button class="btn btn--ghost icon-btn" type="button" id="btn-close" aria-label="Cerrar">${icons.close}</button>
    </header>

    <div class="dialog__body">
      <!-- Formulario: crear una categoría nueva o renombrar la seleccionada -->
      <form class="category-form" novalidate>
        <label for="category-name" id="form-label">Nueva categoría</label>
        <div class="row">
          <input id="category-name" type="text" maxlength="${CATEGORY_NAME_MAX}" autocomplete="off"
            placeholder="Ej.: Universidad" aria-describedby="category-error">
          <button class="btn btn--primary" type="submit" id="btn-save">${icons.plus}Agregar</button>
          <button class="btn" type="button" id="btn-cancel-edit" hidden>Cancelar</button>
        </div>
        <span class="hint">Máximo ${CATEGORY_NAME_MAX} caracteres. No se pueden repetir nombres.</span>
        <p class="error" id="category-error" role="alert"></p>
      </form>

      <h3 id="list-title">Tus categorías</h3>
      <ul aria-labelledby="list-title"></ul>
      <p class="empty" hidden>Aún no tienes categorías. Crea la primera arriba.</p>
    </div>

    <footer class="dialog__footer">
      <button class="btn" type="button" id="btn-done">Listo</button>
    </footer>
  </dialog>
`;

class CategoryManager extends HTMLElement {
  #categories = [];
  #editingId = null; // null = el formulario crea una categoría nueva

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    root.getElementById('btn-close').addEventListener('click', () => this.close());
    root.getElementById('btn-done').addEventListener('click', () => this.close());
    closeOnBackdrop(root.querySelector('dialog'), () => this.close());

    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.#submit();
    });
    root.getElementById('btn-cancel-edit').addEventListener('click', () => this.resetForm());
    root.getElementById('category-name').addEventListener('input', () => this.showError(''));

    // Delegación de eventos: un solo listener para los botones de todas las filas.
    root.querySelector('ul').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      const { id } = button.closest('li').dataset;
      if (button.dataset.action === 'edit') this.#startEdit(id);
      else emit(this, EVENTS.CATEGORY_DELETE, { id });
    });
  }

  open(categories, counts) {
    this.update(categories, counts);
    this.resetForm();
    this.shadowRoot.querySelector('dialog').showModal();
    this.shadowRoot.getElementById('category-name').focus();
  }

  close() {
    this.shadowRoot.querySelector('dialog').close();
  }

  /** Vuelve a pintar la lista y deja el formulario listo para crear otra categoría. */
  update(categories, counts) {
    this.#categories = categories;
    const root = this.shadowRoot;
    const list = root.querySelector('ul');
    // El nombre lo escribió el usuario: se escapa antes de usar innerHTML.
    list.innerHTML = categories.map((category) => this.#itemHTML(category, counts.get(category.id) ?? 0)).join('');
    list.hidden = categories.length === 0;
    root.querySelector('.empty').hidden = categories.length > 0;
    if (this.#editingId && !categories.some((c) => c.id === this.#editingId)) this.resetForm();
  }

  /** Muestra (o borra, con texto vacío) el error del formulario. */
  showError(message) {
    const root = this.shadowRoot;
    const error = root.getElementById('category-error');
    error.innerHTML = message ? `${icons.alert}<span></span>` : '';
    if (message) error.querySelector('span').textContent = message;
    const input = root.getElementById('category-name');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) input.focus();
  }

  #itemHTML(category, taskCount) {
    const name = escapeHTML(category.name);
    return `
      <li data-id="${escapeHTML(category.id)}" class="${category.id === this.#editingId ? 'is-editing' : ''}">
        ${icons.tag}
        <span class="name">${name}<span class="count">${plural(taskCount, 'tarea', 'tareas')}</span></span>
        <span class="actions">
          <button class="btn btn--ghost icon-btn" type="button" data-action="edit" aria-label="Renombrar &quot;${name}&quot;" title="Renombrar">${icons.edit}</button>
          <button class="btn btn--ghost icon-btn delete" type="button" data-action="delete" aria-label="Eliminar &quot;${name}&quot;" title="Eliminar">${icons.trash}</button>
        </span>
      </li>`;
  }

  // Pasa el formulario a modo "renombrar" con el nombre actual de la categoría
  #startEdit(id) {
    const category = this.#categories.find((c) => c.id === id);
    if (!category) return;
    this.#editingId = id;
    const root = this.shadowRoot;
    root.getElementById('form-label').textContent = `Renombrar "${category.name}"`;
    root.getElementById('btn-save').innerHTML = `${icons.check}Guardar`;
    root.getElementById('btn-cancel-edit').hidden = false;
    for (const li of root.querySelectorAll('li')) li.classList.toggle('is-editing', li.dataset.id === id);
    const input = root.getElementById('category-name');
    input.value = category.name;
    this.showError('');
    input.focus();
    input.select();
  }

  /** Vuelve al modo "crear" con el formulario vacío (también se usa después de guardar). */
  resetForm() {
    this.#editingId = null;
    const root = this.shadowRoot;
    root.getElementById('form-label').textContent = 'Nueva categoría';
    root.getElementById('btn-save').innerHTML = `${icons.plus}Agregar`;
    root.getElementById('btn-cancel-edit').hidden = true;
    root.getElementById('category-name').value = '';
    for (const li of root.querySelectorAll('li')) li.classList.remove('is-editing');
    this.showError('');
  }

  // Valida en la ventana (respuesta inmediata) y avisa a task-app; el store vuelve a validar.
  #submit() {
    const name = this.shadowRoot.getElementById('category-name').value.trim();
    const otherNames = this.#categories.filter((c) => c.id !== this.#editingId).map((c) => c.name);
    const { valid, errors } = validateCategoryInput({ name }, otherNames);
    if (!valid) {
      this.showError(errors.name);
      return;
    }
    emit(this, EVENTS.CATEGORY_SAVE, { id: this.#editingId, name });
  }
}

customElements.define('category-manager', CategoryManager);
