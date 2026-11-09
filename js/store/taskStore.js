/**
 * Store central de tareas. Es el ÚNICO módulo que modifica los datos.
 * Responsable: Marlon
 *
 * Los componentes leen con getAll() y piden cambios con add(), update(),
 * toggle(), remove(), importTodos(), markCompleted() y clear().
 * Cada cambio se guarda en localStorage. Después de cada acción, <task-app>
 * vuelve a pintar la lista.
 */
// Funciones del modelo, de los IDs y del guardado que usa el store
import { createApiTask, createLocalTask, isReadOnly, SOURCE, validateTaskInput } from '../models/task.js';
import { apiId, localId } from '../utils/id.js';
import { loadState, saveState } from '../services/storage.js';

// Errores propios: así <task-app> sabe qué tipo de error ocurrió.
// Error cuando los datos del formulario no son válidos
export class ValidationError extends Error {
  constructor(errors) {
    super('Datos de la tarea no válidos.');
    this.name = 'ValidationError';
    this.errors = errors; // { title?: '...', createdAt?: '...' }
  }
}

// Error cuando se intenta modificar una tarea importada
export class ReadOnlyTaskError extends Error {
  constructor() {
    super('Las tareas importadas no se pueden modificar, solo eliminar.');
    this.name = 'ReadOnlyTaskError';
  }
}

// Error cuando no existe una tarea con ese ID
export class TaskNotFoundError extends Error {
  constructor(id) {
    super(`No se encontró la tarea ${id}.`);
    this.name = 'TaskNotFoundError';
  }
}

// Error cuando el navegador no deja guardar
export class StorageError extends Error {
  constructor() {
    super('No se pudieron guardar los cambios en el navegador.');
    this.name = 'StorageError';
  }
}

// Clase que maneja todas las tareas de la aplicación
class TaskStore {
  // # = campo privado: solo se puede usar dentro de esta clase.
  #state = loadState(); // { version, nextSeq, tasks }

  // Devuelve todas las tareas
  getAll() {
    // Se devuelven copias para que nadie modifique los datos desde afuera.
    return this.#state.tasks.map((task) => ({ ...task }));
  }

  // Devuelve una tarea por su ID, o null si no existe
  getById(id) {
    const task = this.#find(id);
    return task ? { ...task } : null;
  }

  /** Ids originales (de la API) de las tareas ya importadas. */
  importedExternalIds() {
    const ids = this.#state.tasks
      .filter((task) => task.source === SOURCE.API)
      .map((task) => task.externalId);
    return new Set(ids);
  }

  // Crea una tarea nueva
  add({ title, createdAt, completed = false }) {
    const { valid, errors } = validateTaskInput({ title, createdAt });
    // Si los datos no son válidos, se detiene y avisa con un error
    if (!valid) throw new ValidationError(errors);

    const task = createLocalTask({
      id: localId(this.#state.nextSeq),
      title,
      createdAt,
      completed,
    });
    // Suma 1 al consecutivo para la próxima tarea
    this.#state.nextSeq += 1;
    this.#state.tasks.unshift(task); // unshift: la agrega al inicio de la lista
    this.#save();
    return { ...task };
  }

  // Edita una tarea existente
  update(id, changes) {
    const task = this.#getEditable(id);
    // Une los cambios con los datos actuales (?? deja el valor anterior si no hay cambio)
    const next = {
      title: changes.title ?? task.title,
      createdAt: changes.createdAt ?? task.createdAt,
      completed: changes.completed ?? task.completed,
    };
    const { valid, errors } = validateTaskInput(next);
    if (!valid) throw new ValidationError(errors);

    task.title = String(next.title).trim();
    task.createdAt = next.createdAt;
    task.completed = Boolean(next.completed);
    this.#save();
    return { ...task };
  }

  // Cambia una tarea de pendiente a completada, o al revés
  toggle(id) {
    const task = this.#getEditable(id);
    task.completed = !task.completed;
    this.#save();
    return { ...task };
  }

  // Elimina una tarea (también funciona con las importadas)
  remove(id) {
    const index = this.#state.tasks.findIndex((task) => task.id === id);
    if (index === -1) throw new TaskNotFoundError(id);
    this.#state.tasks.splice(index, 1);
    this.#save();
  }

  /**
   * Importa tareas de la API, omitiendo las que ya existen.
   * Devuelve { added, skipped }: cuántas se agregaron y cuántas ya estaban.
   */
  importTodos(todos) {
    // IDs que ya están en la lista, para no repetir
    const existing = new Set(this.#state.tasks.map((task) => task.id));
    const newTasks = [];
    let skipped = 0;

    // Revisa una por una las tareas que se quieren importar
    for (const todo of todos) {
      if (existing.has(apiId(todo.id))) {
        skipped += 1;
      } else {
        const task = createApiTask(todo);
        existing.add(task.id);
        newTasks.push(task);
      }
    }

    // Solo guarda si hubo tareas nuevas
    if (newTasks.length > 0) {
      this.#state.tasks.unshift(...newTasks);
      this.#save();
    }
    return { added: newTasks.length, skipped };
  }

  /**
   * Marca como completadas las tareas indicadas. Las importadas se omiten
   * porque son de solo lectura. Devuelve cuántas tareas cambiaron.
   */
  markCompleted(ids) {
    // Cuenta cuántas tareas se marcaron
    let changed = 0;
    for (const task of this.#state.tasks) {
      if (ids.includes(task.id) && !isReadOnly(task) && !task.completed) {
        task.completed = true;
        changed += 1;
      }
    }
    if (changed > 0) this.#save();
    return changed;
  }

  /** Vacía la lista. nextSeq se conserva para no reutilizar ids. */
  clear() {
    this.#state.tasks = [];
    this.#save();
  }

  // Busca la tarea original (no una copia)
  #find(id) {
    return this.#state.tasks.find((task) => task.id === id);
  }

  // Busca una tarea que se pueda editar; si no existe o es importada, lanza un error
  #getEditable(id) {
    const task = this.#find(id);
    if (!task) throw new TaskNotFoundError(id);
    if (isReadOnly(task)) throw new ReadOnlyTaskError();
    return task;
  }

  // Guarda el estado en localStorage
  #save() {
    const saved = saveState(this.#state);
    if (!saved) {
      // Si no se pudo guardar, se deshace el cambio volviendo a lo último guardado.
      this.#state = loadState();
      throw new StorageError();
    }
  }
}

// Una sola instancia para toda la app.
export const taskStore = new TaskStore();
