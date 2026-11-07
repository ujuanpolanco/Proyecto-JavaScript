/**
 * <task-app>: componente raíz. Une la interfaz con el store.
 * Responsable: Juan (interfaz) + Marlon (conexión con el store) — punto de integración.
 *
 * Flujo: un componente hijo emite un evento → task-app llama al store →
 * el store valida y guarda en localStorage → task-app vuelve a pintar (#render).
 */
import { baseCss } from './shared-styles.js';
import './task-toolbar.js';
import './task-list.js';
import './task-form-modal.js';
import './import-modal.js';
import './confirm-dialog.js';
import './toast-message.js';

import { EVENTS } from '../utils/events.js';
import { countStats, filterTasks, STATUS } from '../utils/filter.js';
import { plural } from '../utils/format.js';
import { isReadOnly } from '../models/task.js';
import { taskStore, ValidationError } from '../store/taskStore.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    :host { display: block; }
    .shell { max-width: 960px; margin: 0 auto; padding: 2rem 1rem 5rem; }

    .app-header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem 2rem; margin-bottom: 1.75rem; }
    h1 { margin: 0; font-size: 2rem; line-height: 1.15; }
    .subtitle { margin: .375rem 0 0; color: var(--color-text-muted); }

    .progress { flex: 0 1 260px; min-width: 200px; }
    .progress__label { display: flex; justify-content: space-between; font-size: .875rem; color: var(--color-text-muted); margin-bottom: .375rem; }
    .progress__label strong { color: var(--color-text); }
    .progress__track { height: .5rem; border-radius: 999px; background: var(--color-border); overflow: hidden; }
    .progress__bar { height: 100%; width: 0; border-radius: inherit; background: var(--color-success); transition: width .3s ease; }

    main { display: grid; gap: 1rem; }
    .summary { margin: .25rem 0 0; font-size: .875rem; color: var(--color-text-muted); }
    .summary:empty { display: none; }

    footer { margin-top: 2.5rem; text-align: center; font-size: .8125rem; color: var(--color-text-muted); }

    @media (max-width: 640px) {
      .progress { flex-basis: 100%; }
      h1 { font-size: 1.625rem; }
    }
  </style>

  <div class="shell">
    <header class="app-header">
      <div>
        <h1>Gestor de tareas</h1>
        <p class="subtitle">Organiza, importa y completa tus pendientes.</p>
      </div>
      <div class="progress">
        <div class="progress__label"><span id="progress-label">Progreso</span><strong id="progress-value">0%</strong></div>
        <div class="progress__track" id="progress-track" role="progressbar" aria-labelledby="progress-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="progress__bar" id="progress-bar"></div>
        </div>
      </div>
    </header>

    <main>
      <task-toolbar></task-toolbar>
      <p class="summary" aria-live="polite"></p>
      <task-list></task-list>
    </main>

    <footer>Tus tareas se guardan en este navegador.</footer>
  </div>

  <task-form-modal></task-form-modal>
  <import-modal></import-modal>
  <confirm-dialog></confirm-dialog>
  <toast-message></toast-message>
`;

class TaskApp extends HTMLElement {
  #filters = { status: STATUS.ALL, query: '' };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    // Accesos directos a los componentes hijos.
    const root = this.shadowRoot;
    this.toolbar = root.querySelector('task-toolbar');
    this.list = root.querySelector('task-list');
    this.form = root.querySelector('task-form-modal');
    this.importer = root.querySelector('import-modal');
    this.confirm = root.querySelector('confirm-dialog');
    this.toast = root.querySelector('toast-message');

    this.#listen();
  }

  connectedCallback() {
    this.#render();
  }

  /**
   * Los eventos de los hijos tienen bubbles + composed, así que suben hasta
   * el shadowRoot de task-app y aquí se escuchan todos.
   */
  #listen() {
    const root = this.shadowRoot;
    root.addEventListener(EVENTS.CREATE_REQUEST, () => this.form.open());
    root.addEventListener(EVENTS.EDIT, (e) => this.#edit(e.detail.id));
    root.addEventListener(EVENTS.SAVE, (e) => this.#save(e.detail));
    root.addEventListener(EVENTS.TOGGLE, (e) => this.#toggle(e.detail.id));
    root.addEventListener(EVENTS.DELETE, (e) => this.#delete(e.detail.id));
    root.addEventListener(EVENTS.IMPORT_REQUEST, () => this.importer.open(taskStore.importedExternalIds()));
    root.addEventListener(EVENTS.IMPORT, (e) => this.#import(e.detail.todos));
    root.addEventListener(EVENTS.COMPLETE_ALL_REQUEST, () => this.#completeVisible());
    root.addEventListener(EVENTS.CLEAR_REQUEST, () => this.#clear());
    root.addEventListener(EVENTS.FILTER_CHANGE, (e) => {
      this.#filters = e.detail;
      this.#render();
    });
    root.addEventListener(EVENTS.FILTER_RESET_REQUEST, () => {
      this.toolbar.reset();
      this.toolbar.focusSearch();
    });
  }

  /** Vuelve a pintar la lista, los contadores, el resumen y la barra de progreso. */
  #render() {
    const all = taskStore.getAll();
    const visible = filterTasks(all, this.#filters);
    const stats = countStats(all);

    this.toolbar.updateStats(stats);
    this.list.update({ tasks: visible, total: all.length });

    const summary = this.shadowRoot.querySelector('.summary');
    const isFiltered = this.#filters.query.trim() !== '' || this.#filters.status !== STATUS.ALL;
    if (all.length === 0) {
      summary.textContent = '';
    } else if (isFiltered) {
      summary.textContent = `Mostrando ${visible.length} de ${plural(all.length, 'tarea', 'tareas')}`;
    } else {
      summary.textContent = `${plural(all.length, 'tarea', 'tareas')} · ${plural(stats.pending, 'pendiente', 'pendientes')}`;
    }

    const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    this.shadowRoot.getElementById('progress-value').textContent = `${percent}%`;
    this.shadowRoot.getElementById('progress-bar').style.width = `${percent}%`;
    this.shadowRoot.getElementById('progress-track').setAttribute('aria-valuenow', percent);
  }

  /**
   * Ejecuta una acción del store. Si sale bien muestra el mensaje de éxito;
   * si falla, muestra el error. Siempre vuelve a pintar.
   * Devuelve lo que devuelva la acción, o undefined si falló.
   */
  #run(action, successMessage) {
    let result;
    try {
      result = action();
      if (successMessage) this.toast.show(successMessage, 'success');
    } catch (error) {
      this.toast.show(error.message, 'error');
      console.error(error);
    }
    this.#render();
    return result;
  }

  #edit(id) {
    const task = taskStore.getById(id);
    if (!task) return;
    if (isReadOnly(task)) {
      this.toast.show('Las tareas importadas no se pueden editar, solo eliminar.', 'info');
      return;
    }
    this.form.open(task);
  }

  #save({ id, data }) {
    let saved = null;
    try {
      saved = id ? taskStore.update(id, data) : taskStore.add(data);
      this.form.close();
      this.toast.show(id ? 'Cambios guardados' : 'Tarea creada', 'success');
    } catch (error) {
      if (error instanceof ValidationError) {
        this.form.showErrors(error.errors); // el formulario se queda abierto con los errores
      } else {
        this.form.close();
        this.toast.show(error.message, 'error');
      }
    }
    this.#render();
    // La lista se volvió a crear: el foco pasa a la tarea creada o editada.
    if (saved) this.list.focusTask(saved.id);
  }

  #toggle(id) {
    this.#run(() => taskStore.toggle(id));
    // La lista se volvió a crear: se devuelve el foco al círculo de la misma tarea.
    this.list.focusTask(id);
  }

  #delete(id) {
    const task = taskStore.getById(id);
    if (!task) return;
    this.confirm.ask({
      title: '¿Eliminar esta tarea?',
      message: `"${task.title}" se eliminará de forma permanente.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      onConfirm: () => {
        this.#run(() => taskStore.remove(id), 'Tarea eliminada');
        this.toolbar.focusCreate(); // el botón de la tarea eliminada ya no existe
      },
    });
  }

  #import(todos) {
    this.importer.close(); // se cierra primero para que el aviso no quede tapado por el modal
    const result = this.#run(() => taskStore.importTodos(todos));
    this.toolbar.focusCreate(); // por si se abrió desde "Aún no tienes tareas", que ya no se ve
    if (!result) return; // falló: #run ya mostró el error

    let message = result.added > 0
      ? plural(result.added, 'tarea importada', 'tareas importadas')
      : 'No se importó ninguna tarea nueva';
    if (result.skipped > 0) message += ` · ${plural(result.skipped, 'ya existía', 'ya existían')}`;
    this.toast.show(message, result.added > 0 ? 'success' : 'info');
  }

  /**
   * "Marcar terminadas": marca como completadas las tareas pendientes que se
   * están viendo (respeta la búsqueda y el filtro). Las importadas se omiten.
   */
  #completeVisible() {
    const visible = filterTasks(taskStore.getAll(), this.#filters);
    const candidates = visible.filter((task) => !task.completed && !isReadOnly(task));
    const skippedImported = visible.filter((task) => !task.completed && isReadOnly(task)).length;

    if (candidates.length === 0) {
      const message = skippedImported > 0
        ? 'Las tareas pendientes visibles son importadas y no se pueden modificar.'
        : 'No hay tareas pendientes para marcar.';
      this.toast.show(message, 'info');
      return;
    }

    let note = '';
    if (skippedImported > 0) note = ` Se omitirán ${plural(skippedImported, 'tarea importada', 'tareas importadas')}.`;

    this.confirm.ask({
      title: '¿Marcar como terminadas?',
      message: `Se marcará como completada: ${plural(candidates.length, 'tarea pendiente', 'tareas pendientes')}.${note}`,
      confirmText: 'Marcar terminadas',
      onConfirm: () => {
        const ids = candidates.map((task) => task.id);
        const changed = this.#run(() => taskStore.markCompleted(ids));
        if (changed) this.toast.show(`${plural(changed, 'tarea marcada', 'tareas marcadas')} como terminada${changed === 1 ? '' : 's'}`, 'success');
      },
    });
  }

  #clear() {
    const total = taskStore.getAll().length;
    if (total === 0) return;
    this.confirm.ask({
      title: '¿Vaciar la lista?',
      message: `Se eliminarán ${plural(total, 'tarea', 'tareas')}, incluidas las importadas. Esta acción no se puede deshacer.`,
      confirmText: 'Vaciar lista',
      tone: 'danger',
      onConfirm: () => {
        this.#run(() => taskStore.clear(), 'Lista vaciada');
        this.toolbar.focusCreate(); // "Vaciar lista" queda deshabilitado
      },
    });
  }
}

customElements.define('task-app', TaskApp);
