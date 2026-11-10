/**
 * <task-item>: una tarea de la lista.
 * Responsable: Juan
 *
 * Uso: item.setTask(tarea)
 * Emite: TOGGLE, EDIT, DELETE (con { id })
 *
 * Las tareas importadas (source "api") no se pueden editar ni cambiar de estado:
 * se muestran con la etiqueta "Importada" y solo permiten eliminar.
 */
import { baseCss } from './shared-styles.js';
import { icons } from './icons.js';
import { EVENTS, emit } from '../utils/events.js';
import { formatDate } from '../utils/format.js';
import { isReadOnly } from '../models/task.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${baseCss}
    :host { display: block; }
    /* TARJETA DE LA TAREA: círculo a la izquierda, contenido al centro y botones a la derecha */
    .item {
      display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .875rem;
      padding: .875rem 1rem;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
    }
    .item:hover { border-color: var(--color-border-strong); }
    /* Tarea completada: fondo un poco más gris */
    .item.is-completed { background: var(--color-surface-muted); }

    /* Círculo para marcar la tarea: es un checkbox con otro aspecto. */
    .check {
      appearance: none; display: grid; place-content: center; flex: none;
      width: 1.5rem; height: 1.5rem; margin: 0;
      border: 2px solid var(--color-border-strong); border-radius: 50%;
      background: var(--color-surface); cursor: pointer;
    }
    .check::before {
      content: ""; width: .75rem; height: .75rem; background: var(--color-on-success);
      clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%); /* forma de palomita */
      transform: scale(0);
    }
    .check:hover:not(:disabled) { border-color: var(--color-success); }
    /* Círculo marcado: fondo verde */
    .check:checked { background: var(--color-success); border-color: var(--color-success); }
    .check:checked::before { transform: scale(1); }
    /* Círculo deshabilitado (tareas importadas) */
    .check:disabled { cursor: not-allowed; opacity: .6; }
    .check:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }

    .content { min-width: 0; }
    /* TÍTULO de la tarea */
    .title { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
    /* Si está completada, el título se tacha */
    .is-completed .title { color: var(--color-text-muted); text-decoration: line-through; }
    /* DESCRIPCIÓN debajo del título: letra más pequeña y gris; se oculta si está vacía */
    .description { margin: .125rem 0 0; font-size: .875rem; color: var(--color-text-muted); overflow-wrap: anywhere; white-space: pre-line; }
    .description:empty { display: none; }

    /* Fila de datos debajo del título: estado, importada, fecha e ID */
    .meta {
      display: flex; flex-wrap: wrap; align-items: center; gap: .375rem .75rem;
      margin: .375rem 0 0; font-size: .8125rem; color: var(--color-text-muted);
    }
    .meta svg { width: .875rem; height: .875rem; }
    .date { display: inline-flex; align-items: center; gap: .3rem; }
    /* ID con letra de ancho fijo */
    .id { font-family: Consolas, monospace; font-size: .75rem; }

    /* ETIQUETAS de estado: Pendiente (naranja), Completada (verde) e Importada (azul) */
    .badge {
      display: inline-flex; align-items: center; gap: .25rem;
      padding: .0625rem .5rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
    }
    .badge svg { width: .75rem; height: .75rem; }
    .badge--pending { background: var(--color-warning-soft); color: var(--color-warning); }
    .badge--done { background: var(--color-success-soft); color: var(--color-success); }
    .badge--api { background: var(--color-info-soft); color: var(--color-info); }

    /* BOTONES editar y eliminar */
    .actions { display: flex; gap: .25rem; }
    /* Al pasar el mouse por la papelera se pone roja */
    .delete:hover:not(:disabled) { color: var(--color-danger); background: var(--color-danger-soft); }
    .actions svg { width: 1.125rem; height: 1.125rem; }

    /* En celular: menos espacio y los botones uno encima del otro */
    @media (max-width: 480px) {
      .item { gap: .625rem; padding: .75rem .5rem .75rem .75rem; align-items: start; }
      .check { margin-top: .125rem; }
      .actions { flex-direction: column; gap: 0; }
    }
  </style>

  <!-- Tarjeta de la tarea -->
  <article class="item">
    <!-- Círculo para marcar como completada -->
    <input class="check" type="checkbox">
    <!-- Título y datos de la tarea -->
    <div class="content">
      <p class="title"></p>
      <!-- Descripción de la tarea (si tiene) -->
      <p class="description"></p>
      <p class="meta">
        <span class="badge status"></span>
        <span class="badge badge--api imported" hidden>${icons.lock}Importada</span>
        <span class="date" title="Fecha de registro">${icons.calendar}<span class="date-text"></span></span>
        <span class="id"></span>
      </p>
    </div>
    <!-- Botones editar (lápiz) y eliminar (papelera) -->
    <div class="actions">
      <button class="btn btn--ghost icon-btn edit" type="button" title="Editar">${icons.edit}</button>
      <button class="btn btn--ghost icon-btn delete" type="button" title="Eliminar">${icons.trash}</button>
    </div>
  </article>
`;

// Clase del componente <task-item>
class TaskItem extends HTMLElement {
  // Tarea que muestra este componente
  #task = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));

    const root = this.shadowRoot;
    // Al marcar el círculo o pulsar un botón, avisa a task-app con el ID de la tarea
    root.querySelector('.check').addEventListener('change', () => {
      emit(this, EVENTS.TOGGLE, { id: this.#task.id });
    });
    root.querySelector('.edit').addEventListener('click', () => {
      emit(this, EVENTS.EDIT, { id: this.#task.id });
    });
    root.querySelector('.delete').addEventListener('click', () => {
      emit(this, EVENTS.DELETE, { id: this.#task.id });
    });
  }

  /** Recibe la tarea y pinta sus datos. */
  setTask(task) {
    this.#task = task;
    const root = this.shadowRoot;
    // ¿Es importada? Entonces no se puede editar ni marcar
    const readOnly = isReadOnly(task);

    root.querySelector('.item').classList.toggle('is-completed', task.completed);
    // textContent (y no innerHTML) para que un título como "<b>hola</b>" se vea como texto.
    root.querySelector('.title').textContent = task.title;
    // textContent: la descripción se muestra como texto, nunca como HTML
    root.querySelector('.description').textContent = task.description ?? '';
    root.querySelector('.id').textContent = task.id;
    root.querySelector('.date-text').textContent = formatDate(task.createdAt);

    // Etiqueta Pendiente o Completada
    const status = root.querySelector('.status');
    status.textContent = task.completed ? 'Completada' : 'Pendiente';
    status.className = `badge status ${task.completed ? 'badge--done' : 'badge--pending'}`;
    root.querySelector('.imported').hidden = !readOnly;

    // Círculo: marcado si está completada y deshabilitado si es importada
    const check = root.querySelector('.check');
    check.checked = task.completed;
    check.disabled = readOnly;
    check.title = readOnly
      ? 'Las tareas importadas no se pueden modificar'
      : `Marcar como ${task.completed ? 'pendiente' : 'completada'}`;
    // aria-label: lo que lee un lector de pantalla para personas con discapacidad visual.
    check.setAttribute('aria-label', `${check.title}: "${task.title}"`);

    // El lápiz se oculta en las tareas importadas
    const edit = root.querySelector('.edit');
    edit.hidden = readOnly;
    edit.setAttribute('aria-label', `Editar "${task.title}"`);
    root.querySelector('.delete').setAttribute('aria-label', `Eliminar "${task.title}"`);
  }

  /** Pone el foco en el círculo (se usa después de marcar la tarea con el teclado). */
  focusCheck() {
    this.shadowRoot.querySelector('.check').focus();
  }
}

// Registra la etiqueta <task-item>
customElements.define('task-item', TaskItem);
