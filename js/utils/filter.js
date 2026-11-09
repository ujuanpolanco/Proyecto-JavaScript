/**
 * Filtro por estado, buscador y estadísticas.
 * Responsable: Marlon
 */
// Opciones del filtro por estado: todas, pendientes o completadas
export const STATUS = Object.freeze({
  ALL: 'all',
  PENDING: 'pending',
  COMPLETED: 'completed',
});

/**
 * Pasa el texto a minúsculas y le quita las tildes, para que "Reunión" coincida
 * con "reunion". normalize('NFD') separa cada letra de su tilde ("ó" → "o" + "´")
 * y el replace borra las tildes, que están en el rango Unicode \u0300-\u036f.
 */
export function normalize(text) {
  return String(text ?? '')
    // Separa cada letra de su tilde
    .normalize('NFD')
    // Borra las tildes
    .replace(/[\u0300-\u036f]/g, '')
    // Pasa todo a minúsculas
    .toLowerCase()
    // Quita los espacios al inicio y al final
    .trim();
}

// Dice si una tarea cumple el filtro de estado elegido
export function matchesStatus(task, status) {
  if (status === STATUS.COMPLETED) return task.completed;
  if (status === STATUS.PENDING) return !task.completed;
  return true;
}

/**
 * Busca en el título. Solo busca en el ID si lo que se escribe empieza por "tsk"
 * (por ejemplo "tsk-l-000003"); así una letra suelta como "k" no coincide
 * con todas las tareas.
 */
function matchesQuery(task, query) {
  // Si el buscador está vacío, todas las tareas coinciden
  if (!query) return true;
  // ¿El título contiene el texto buscado?
  if (normalize(task.title).includes(query)) return true;
  // Solo compara con el ID si el texto empieza por 'tsk'
  return query.startsWith('tsk') && normalize(task.id).startsWith(query);
}

// Devuelve solo las tareas que cumplen el filtro de estado y la búsqueda
export function filterTasks(tasks, { status = STATUS.ALL, query = '' } = {}) {
  const q = normalize(query);
  return tasks.filter((task) => matchesStatus(task, status) && matchesQuery(task, q));
}

// Cuenta el total, las completadas y las pendientes (para los contadores y la barra de progreso)
export function countStats(tasks) {
  const completed = tasks.filter((task) => task.completed).length;
  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
  };
}
