/**
 * <task-list>: lista de tareas con estados vacíos.
 * Responsable: Juan
 *
 * Uso: list.update({ tasks, total })
 *   tasks → tareas ya filtradas que se deben mostrar
 *   total → cuántas tareas hay en total (para distinguir "lista vacía" de "sin resultados")
 */
import { baseCss } from './shared-styles.js';
import { icons } from './icons.js';
import { EVENTS, emit } from '../utils/events.js';
import './task-item.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    :host { display: block; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }

    .empty {
      display: grid; justify-items: center; gap: .5rem;
      padding: 3rem 1.5rem; text-align: center;
      background: var(--color-surface); border: 2px dashed var(--color-border-strong);
      border-radius: var(--radius-lg); color: var(--color-text-muted);
    }
    .empty > svg { width: 3rem; height: 3rem; color: var(--color-primary); }
    .empty h2 { margin: .25rem 0 0; font-size: 1.125rem; color: var(--color-text); }
    .empty p { margin: 0 0 .75rem; max-width: 36ch; }
    .empty .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; }
  </style>

  <ul aria-label="Tareas"></ul>

  <div class="empty" id="empty-none" hidden>
    ${icons.inbox}
    <h2>Aún no tienes tareas</h2>
    <p>Crea tu primera tarea o importa algunas desde el banco de tareas.</p>
    <div class="actions">
      <button class="btn btn--primary" type="button" id="btn-create">${icons.plus}Nueva tarea</button>
      <button class="btn" type="button" id="btn-import">${icons.download}Importar tareas</button>
    </div>
  </div>

  <div class="empty" id="empty-results" hidden>
    ${icons.search}
    <h2>Sin resultados</h2>
    <p>Ninguna tarea coincide con la búsqueda o el filtro seleccionado.</p>
    <div class="actions">
      <button class="btn" type="button" id="btn-reset">Limpiar filtros</button>
    </div>
  </div>
`;

class TaskList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    root.getElementById('btn-create').addEventListener('click', () => emit(this, EVENTS.CREATE_REQUEST));
    root.getElementById('btn-import').addEventListener('click', () => emit(this, EVENTS.IMPORT_REQUEST));
    root.getElementById('btn-reset').addEventListener('click', () => emit(this, EVENTS.FILTER_RESET_REQUEST));
  }

  update({ tasks, total }) {
    const root = this.shadowRoot;
    const list = root.querySelector('ul');

    // Qué se muestra: la lista, "Aún no tienes tareas" o "Sin resultados".
    root.getElementById('empty-none').hidden = total > 0;
    root.getElementById('empty-results').hidden = total === 0 || tasks.length > 0;
    list.hidden = tasks.length === 0;

    // Se vacía la lista y se vuelve a crear un <task-item> por cada tarea.
    list.innerHTML = '';
    for (const task of tasks) {
      const li = document.createElement('li');
      const item = document.createElement('task-item');
      item.dataset.id = task.id; // queda como atributo data-id="TSK-L-000001"
      item.setTask(task);
      li.append(item);
      list.append(li);
    }
  }

  /** Devuelve el foco al círculo de una tarea (la lista se acaba de volver a crear). */
  focusTask(id) {
    const item = this.shadowRoot.querySelector(`task-item[data-id="${id}"]`);
    if (item) item.focusCheck();
  }
}

customElements.define('task-list', TaskList);
