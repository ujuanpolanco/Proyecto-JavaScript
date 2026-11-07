/**
 * Contrato de eventos entre componentes.
 * Responsables: Juan y Marlon (compartido — no cambiar sin avisar al otro)
 *
 * Todos los eventos usan bubbles + composed para atravesar el Shadow DOM
 * y llegar hasta <task-app>, que es quien habla con el store.
 */
export const EVENTS = Object.freeze({
  CREATE_REQUEST: 'task:create-request', //  {}            abrir formulario vacío
  EDIT: 'task:edit', //                      { id }        abrir formulario con la tarea
  SAVE: 'task:save', //                      { id?, data } guardar desde el formulario
  TOGGLE: 'task:toggle', //                  { id }        cambiar completada/pendiente
  DELETE: 'task:delete', //                  { id }        eliminar una tarea
  IMPORT_REQUEST: 'task:import-request', //  {}            abrir modal de importar
  IMPORT: 'task:import', //                  { todos }     importar las seleccionadas
  COMPLETE_ALL_REQUEST: 'task:complete-all-request', // {} marcar visibles como terminadas
  CLEAR_REQUEST: 'task:clear-request', //    {}            vaciar la lista
  FILTER_CHANGE: 'filter:change', //         { status, query }
  FILTER_RESET_REQUEST: 'filter:reset-request', // {}      limpiar búsqueda y filtro
});

export function emit(element, name, detail = {}) {
  element.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}
