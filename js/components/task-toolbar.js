/**
 * <task-toolbar>: botones de acción, buscador y filtro por estado.
 * Responsable: Juan
 *
 * Emite: CREATE_REQUEST, IMPORT_REQUEST, COMPLETE_ALL_REQUEST, CLEAR_REQUEST, FILTER_CHANGE
 * Uso: toolbar.updateStats({ total, pending, completed }), toolbar.reset(),
 *      toolbar.focusSearch(), toolbar.focusCreate()
 */
import { baseCss } from './shared-styles.js';
import { icons } from './icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { STATUS } from '../utils/filter.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    :host { display: block; }
    .toolbar { display: grid; gap: .875rem; }

    .actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    .actions .spacer { flex: 1; }

    .filters-row { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }

    .search { position: relative; flex: 1 1 260px; }
    .search svg {
      position: absolute; left: .875rem; top: 50%; transform: translateY(-50%);
      width: 1.125rem; height: 1.125rem; color: var(--color-text-muted); pointer-events: none;
    }
    .search input {
      width: 100%; min-height: 2.75rem; padding: .5rem .75rem .5rem 2.625rem;
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      background: var(--color-surface); color: inherit; font: inherit;
    }
    .search input::placeholder { color: var(--color-text-muted); }

    fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
    .filters {
      display: inline-flex; gap: .25rem; padding: .25rem;
      background: var(--color-surface-muted); border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    /* Cada filtro es un radio invisible encima de un "chip" que sí se ve. */
    .filters label { position: relative; display: flex; }
    .filters input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
    .chip {
      display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
      min-height: 2.125rem; padding: .25rem .75rem; border-radius: var(--radius-sm);
      font-size: .875rem; font-weight: 600; color: var(--color-text-muted); white-space: nowrap;
    }
    .filters input:checked + .chip { background: var(--color-surface); color: var(--color-text); box-shadow: var(--shadow-sm); }
    .filters input:focus-visible + .chip { outline: 3px solid var(--color-focus); outline-offset: 1px; }
    .count {
      min-width: 1.5rem; padding: 0 .375rem; border-radius: 999px;
      background: var(--color-border); font-size: .75rem;
    }

    @media (max-width: 640px) {
      .actions { display: grid; grid-template-columns: 1fr 1fr; }
      .actions .btn--primary, .actions .btn--danger { grid-column: 1 / -1; }
      .actions .spacer { display: none; }
      .filters { display: flex; width: 100%; }
      .filters label { flex: 1; }
      .chip { width: 100%; padding-inline: .375rem; }
    }
    /* Celulares muy angostos: un botón por fila y los filtros pueden bajar a una segunda fila. */
    @media (max-width: 400px) {
      .actions { grid-template-columns: 1fr; }
      .filters { flex-wrap: wrap; }
      .filters label { flex: 1 1 auto; }
    }
  </style>

  <div class="toolbar">
    <div class="actions">
      <button class="btn btn--primary" type="button" id="btn-create">${icons.plus}Nueva tarea</button>
      <button class="btn" type="button" id="btn-import">${icons.download}Importar</button>
      <span class="spacer"></span>
      <button class="btn" type="button" id="btn-complete"
        title="Marca como terminadas las tareas pendientes que estás viendo">${icons.checkAll}Marcar terminadas</button>
      <button class="btn btn--danger" type="button" id="btn-clear">${icons.trash}Vaciar lista</button>
    </div>

    <div class="filters-row">
      <div class="search" role="search">
        ${icons.search}
        <label class="sr-only" for="search">Buscar tareas</label>
        <input id="search" type="search" placeholder="Buscar por título o ID..." autocomplete="off">
      </div>

      <fieldset class="filters">
        <legend class="sr-only">Filtrar por estado</legend>
        <label><input type="radio" name="status" value="${STATUS.ALL}" checked>
          <span class="chip">Todas <span class="count" id="count-total">0</span></span></label>
        <label><input type="radio" name="status" value="${STATUS.PENDING}">
          <span class="chip">Pendientes <span class="count" id="count-pending">0</span></span></label>
        <label><input type="radio" name="status" value="${STATUS.COMPLETED}">
          <span class="chip">Completadas <span class="count" id="count-completed">0</span></span></label>
      </fieldset>
    </div>
  </div>
`;

class TaskToolbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    root.getElementById('btn-create').addEventListener('click', () => emit(this, EVENTS.CREATE_REQUEST));
    root.getElementById('btn-import').addEventListener('click', () => emit(this, EVENTS.IMPORT_REQUEST));
    root.getElementById('btn-complete').addEventListener('click', () => emit(this, EVENTS.COMPLETE_ALL_REQUEST));
    root.getElementById('btn-clear').addEventListener('click', () => emit(this, EVENTS.CLEAR_REQUEST));

    const search = root.getElementById('search');
    search.addEventListener('input', () => this.#emitFilters());
    // Esc borra la búsqueda.
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        search.value = '';
        this.#emitFilters();
      }
    });
    // El evento change de los radios sube (burbujea) hasta el fieldset.
    root.querySelector('.filters').addEventListener('change', () => this.#emitFilters());
  }

  /** Actualiza los contadores y deshabilita los botones que no aplican. */
  updateStats({ total, pending, completed }) {
    const root = this.shadowRoot;
    root.getElementById('count-total').textContent = total;
    root.getElementById('count-pending').textContent = pending;
    root.getElementById('count-completed').textContent = completed;
    root.getElementById('btn-clear').disabled = total === 0;
    root.getElementById('btn-complete').disabled = pending === 0;
  }

  /** Limpia la búsqueda y vuelve al filtro "Todas". */
  reset() {
    this.shadowRoot.getElementById('search').value = '';
    this.shadowRoot.querySelector(`input[value="${STATUS.ALL}"]`).checked = true;
    this.#emitFilters();
  }

  focusSearch() {
    this.shadowRoot.getElementById('search').focus();
  }

  focusCreate() {
    this.shadowRoot.getElementById('btn-create').focus();
  }

  #emitFilters() {
    const root = this.shadowRoot;
    emit(this, EVENTS.FILTER_CHANGE, {
      status: root.querySelector('input[name="status"]:checked').value,
      query: root.getElementById('search').value,
    });
  }
}

customElements.define('task-toolbar', TaskToolbar);
