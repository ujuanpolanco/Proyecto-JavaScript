/**
 * <import-modal>: selecciona tareas del banco público (jsonplaceholder) para importarlas.
 * Responsable: Marlon
 *
 * Uso: importer.open(idsYaImportados), importer.close()
 * Emite: IMPORT { todos: [{ id, title, completed, userId }] }
 *
 * Estados: cargando → listo | error (con botón "Reintentar").
 * Las tareas ya importadas aparecen marcadas y deshabilitadas.
 */
import { baseCss, dialogCss } from './shared-styles.js';
import { icons } from './icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { closeOnBackdrop, escapeHTML } from '../utils/dom.js';
import { STATUS, matchesStatus, normalize } from '../utils/filter.js';
import { fetchTodos } from '../services/api.js';

// Copia en memoria del banco: así no se descarga cada vez que se abre el modal.
let cachedTodos = null;

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    ${dialogCss}
    /* En computador la ventana es más ancha (720px) */
    @media (min-width: 561px) { dialog { width: min(720px, calc(100vw - 2rem)); } } /* en celular se usa el ancho completo */
    .dialog__body { display: flex; flex-direction: column; min-height: 320px; }

    /* ESTADOS de la ventana: cargando o error, centrados */
    .state { display: grid; place-items: center; align-content: center; gap: .75rem; flex: 1; padding: 2rem 1rem; text-align: center; color: var(--color-text-muted); }
    .state p { margin: 0; max-width: 40ch; }
    /* Círculo que gira mientras carga */
    .spinner { width: 2.25rem; height: 2.25rem; border: 3px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin .8s linear infinite; }
    .state--error > svg { width: 2.75rem; height: 2.75rem; color: var(--color-danger); }
    .state--error strong { color: var(--color-text); font-size: 1.0625rem; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Estado LISTO: buscador, filtro y lista del banco */
    .ready { display: flex; flex-direction: column; gap: .75rem; flex: 1; min-height: 0; }
    /* Buscador y selector de estado */
    .controls { display: flex; flex-wrap: wrap; gap: .5rem; }
    .controls input, .controls select {
      min-height: 2.5rem; padding: .375rem .75rem; font: inherit; color: inherit;
      background: var(--color-surface); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
    }
    .controls input { flex: 1 1 220px; }

    /* Caja con la lista del banco */
    .box { display: flex; flex-direction: column; min-height: 0; flex: 1; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
    /* Fila Seleccionar visibles */
    .select-all {
      display: flex; align-items: center; gap: .625rem; padding: .625rem .875rem;
      background: var(--color-surface-muted); border-bottom: 1px solid var(--color-border);
      font-size: .875rem; font-weight: 600; cursor: pointer;
    }
    /* Lista del banco, con barra de desplazamiento */
    ul { list-style: none; margin: 0; padding: 0; overflow: auto; max-height: min(46vh, 400px); }
    li + li { border-top: 1px solid var(--color-border); }
    li label { display: grid; grid-template-columns: auto 1fr auto; gap: .75rem; align-items: center; padding: .625rem .875rem; cursor: pointer; }
    li label:hover { background: var(--color-surface-hover); }
    /* Tarea seleccionada: fondo morado claro */
    li.is-selected label { background: var(--color-primary-soft); }
    /* Tarea ya importada: texto gris y no se puede elegir */
    li.is-imported label { cursor: not-allowed; color: var(--color-text-muted); }
    input[type="checkbox"] { width: 1.125rem; height: 1.125rem; margin: 0; accent-color: var(--color-primary); }
    .todo-title { overflow-wrap: anywhere; }
    .todo-meta { display: block; font-size: .75rem; color: var(--color-text-muted); }
    /* ETIQUETAS: Completada (verde), Pendiente (naranja) y Ya importada (azul) */
    .tag { padding: .0625rem .5rem; border-radius: 999px; font-size: .75rem; font-weight: 600; white-space: nowrap; }
    .tag--done { background: var(--color-success-soft); color: var(--color-success); }
    .tag--pending { background: var(--color-warning-soft); color: var(--color-warning); }
    .tag--imported { background: var(--color-info-soft); color: var(--color-info); }
    .no-results { padding: 2rem 1rem; margin: 0; text-align: center; color: var(--color-text-muted); }

    /* Texto con cuántas tareas están seleccionadas */
    .selected-count { margin-right: auto; font-size: .875rem; font-weight: 600; }
    @media (max-width: 560px) { .selected-count { flex-basis: 100%; } }
  </style>

  <!-- Ventana de importar -->
  <dialog aria-labelledby="import-title">
    <header class="dialog__header">
      <div>
        <h2 class="dialog__title" id="import-title">Importar tareas</h2>
        <p class="dialog__subtitle">Selecciona una o varias tareas del banco público. Las tareas importadas no se pueden editar, solo eliminar.</p>
      </div>
      <button class="btn btn--ghost icon-btn" type="button" id="btn-close" aria-label="Cerrar">${icons.close}</button>
    </header>

    <div class="dialog__body">
      <!-- Estado CARGANDO -->
      <div class="state" id="state-loading" role="status">
        <span class="spinner"></span>
        <p>Cargando tareas del banco...</p>
      </div>

      <!-- Estado ERROR, con botón Reintentar -->
      <div class="state state--error" id="state-error" role="alert" hidden>
        ${icons.alert}
        <strong>No pudimos cargar las tareas</strong>
        <p id="error-message"></p>
        <button class="btn" type="button" id="btn-retry">${icons.refresh}Reintentar</button>
      </div>

      <!-- Estado LISTO: buscador, filtro y lista -->
      <div class="ready" id="state-ready" hidden>
        <div class="controls">
          <label class="sr-only" for="bank-search">Buscar en el banco</label>
          <input id="bank-search" type="search" placeholder="Buscar en el banco..." autocomplete="off">
          <label class="sr-only" for="bank-status">Estado</label>
          <select id="bank-status">
            <option value="${STATUS.ALL}">Todas</option>
            <option value="${STATUS.PENDING}">Pendientes</option>
            <option value="${STATUS.COMPLETED}">Completadas</option>
          </select>
        </div>
        <!-- Caja con Seleccionar visibles y la lista -->
        <div class="box">
          <label class="select-all">
            <input type="checkbox" id="select-all">
            <span>Seleccionar visibles <span id="visible-count"></span></span>
          </label>
          <ul aria-label="Banco de tareas"></ul>
          <p class="no-results" hidden>Ninguna tarea coincide con la búsqueda.</p>
        </div>
      </div>
    </div>

    <!-- Pie: contador de seleccionadas y botones Cancelar e Importar -->
    <footer class="dialog__footer">
      <span class="selected-count" id="selected-count" aria-live="polite">0 seleccionadas</span>
      <button class="btn" type="button" id="btn-cancel">Cancelar</button>
      <button class="btn btn--primary" type="button" id="btn-import" disabled>Importar</button>
    </footer>
  </dialog>
`;

// Clase del componente <import-modal>
class ImportModal extends HTMLElement {
  #todos = [];            // todas las tareas del banco
  #visible = [];          // las que se ven según la búsqueda y el filtro
  #selected = new Set();  // ids marcados por el usuario
  #imported = new Set();  // ids que ya están en la lista (no se pueden volver a importar)
  #loadNumber = 0;        // cuenta las cargas, para ignorar la respuesta de una carga vieja

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    root.getElementById('btn-close').addEventListener('click', () => this.close());
    root.getElementById('btn-cancel').addEventListener('click', () => this.close());
    closeOnBackdrop(root.querySelector('dialog'), () => this.close());

    // Botones y controles de la ventana
    root.getElementById('btn-retry').addEventListener('click', () => this.#load());
    root.getElementById('bank-search').addEventListener('input', () => this.#renderList());
    root.getElementById('bank-status').addEventListener('change', () => this.#renderList());
    root.getElementById('select-all').addEventListener('change', (e) => this.#toggleVisible(e.target.checked));
    root.getElementById('btn-import').addEventListener('click', () => this.#import());

    // Delegación de eventos: un solo listener en la <ul> para todos los checkboxes.
    root.querySelector('ul').addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') this.#toggleOne(Number(e.target.value), e.target.checked);
    });
  }

  /** importedIds: Set con los ids originales de la API que ya están en la lista. */
  open(importedIds) {
    const root = this.shadowRoot;
    this.#imported = importedIds;
    this.#selected.clear();
    root.getElementById('bank-search').value = '';
    root.getElementById('bank-status').value = STATUS.ALL;
    this.#updateFooter();
    root.querySelector('dialog').showModal();

    if (cachedTodos) {
      this.#showTodos(cachedTodos);
    } else {
      this.#load();
    }
  }

  // Cierra la ventana
  close() {
    this.shadowRoot.querySelector('dialog').close();
  }

  // Descarga las tareas de la API (async: espera la respuesta sin congelar la página)
  async #load() {
    this.#loadNumber += 1;
    const myLoad = this.#loadNumber;
    this.#setState('loading');
    try {
      const todos = await fetchTodos();
      cachedTodos = todos;
      // Si mientras esperaba se cerró el modal o empezó otra carga, esta respuesta ya no sirve.
      if (myLoad !== this.#loadNumber || !this.shadowRoot.querySelector('dialog').open) return;
      this.#showTodos(todos);
    } catch (error) {
      if (myLoad !== this.#loadNumber || !this.shadowRoot.querySelector('dialog').open) return;
      this.shadowRoot.getElementById('error-message').textContent = error.message;
      this.#setState('error');
      this.shadowRoot.getElementById('btn-retry').focus();
    }
  }

  // Muestra la lista del banco
  #showTodos(todos) {
    this.#todos = todos;
    this.#setState('ready');
    this.#renderList();
    this.shadowRoot.getElementById('bank-search').focus();
  }

  /** state: 'loading' | 'error' | 'ready'. Muestra ese bloque y oculta los demás. */
  #setState(state) {
    const root = this.shadowRoot;
    root.getElementById('state-loading').hidden = state !== 'loading';
    root.getElementById('state-error').hidden = state !== 'error';
    root.getElementById('state-ready').hidden = state !== 'ready';
  }

  #renderList() {
    const root = this.shadowRoot;
    const q = normalize(root.getElementById('bank-search').value);
    const status = root.getElementById('bank-status').value;
    this.#visible = this.#todos.filter(
      (todo) => matchesStatus(todo, status) && (!q || normalize(todo.title).includes(q) || String(todo.id) === q)
    );

    const list = root.querySelector('ul');
    // El título viene de la API: se escapa antes de usar innerHTML.
    list.innerHTML = this.#visible.map((todo) => this.#itemHTML(todo)).join('');

    list.hidden = this.#visible.length === 0;
    root.querySelector('.no-results').hidden = this.#visible.length > 0;
    root.getElementById('visible-count').textContent = `(${this.#selectableVisible().length})`;
    this.#updateFooter();
  }

  // Arma el HTML de una tarea del banco con su etiqueta
  #itemHTML(todo) {
    const imported = this.#imported.has(todo.id);
    const selected = this.#selected.has(todo.id);
    let tag = '<span class="tag tag--pending">Pendiente</span>';
    if (todo.completed) tag = '<span class="tag tag--done">Completada</span>';
    if (imported) tag = '<span class="tag tag--imported">Ya importada</span>';

    return `
      <li class="${imported ? 'is-imported' : ''} ${selected ? 'is-selected' : ''}" data-id="${todo.id}">
        <label>
          <input type="checkbox" value="${todo.id}" ${imported ? 'checked disabled' : ''} ${selected ? 'checked' : ''}>
          <span>
            <span class="todo-title">${escapeHTML(todo.title)}</span>
            <span class="todo-meta">#${todo.id} · Usuario ${escapeHTML(todo.userId)}</span>
          </span>
          ${tag}
        </label>
      </li>`;
  }

  /** Tareas visibles que todavía se pueden seleccionar (no importadas). */
  #selectableVisible() {
    return this.#visible.filter((todo) => !this.#imported.has(todo.id));
  }

  // Marca o desmarca una tarea
  #toggleOne(id, checked) {
    if (checked) this.#selected.add(id);
    else this.#selected.delete(id);
    const li = this.shadowRoot.querySelector(`li[data-id="${id}"]`);
    li.classList.toggle('is-selected', checked);
    this.#updateFooter();
  }

  // Marca o desmarca todas las tareas visibles
  #toggleVisible(checked) {
    for (const todo of this.#selectableVisible()) {
      if (checked) this.#selected.add(todo.id);
      else this.#selected.delete(todo.id);
    }
    this.#renderList();
  }

  // Actualiza el contador de seleccionadas y el botón Importar
  #updateFooter() {
    const root = this.shadowRoot;
    const count = this.#selected.size;
    root.getElementById('selected-count').textContent = count === 1 ? '1 seleccionada' : `${count} seleccionadas`;

    const importBtn = root.getElementById('btn-import');
    importBtn.disabled = count === 0;
    const label = count > 0 ? `Importar (${count})` : 'Importar';
    importBtn.innerHTML = icons.download + label;

    // "Seleccionar visibles": marcado si están todas, a medias (indeterminate) si hay algunas.
    const selectable = this.#selectableVisible();
    const selectedVisible = selectable.filter((todo) => this.#selected.has(todo.id)).length;
    const selectAll = root.getElementById('select-all');
    selectAll.disabled = selectable.length === 0;
    selectAll.checked = selectable.length > 0 && selectedVisible === selectable.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < selectable.length;
  }

  // Envía a task-app las tareas elegidas
  #import() {
    const todos = this.#todos.filter((todo) => this.#selected.has(todo.id));
    if (todos.length > 0) emit(this, EVENTS.IMPORT, { todos });
  }
}

// Registra la etiqueta <import-modal>
customElements.define('import-modal', ImportModal);
