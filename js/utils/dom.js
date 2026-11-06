/**
 * Utilidades de DOM compartidas.
 * Responsables: Juan y Marlon (compartido)
 */

/**
 * Escapa texto antes de insertarlo con innerHTML, para evitar inyección de HTML.
 * Ejemplo: "<b>hola</b>" → "&lt;b&gt;hola&lt;/b&gt;"
 */
export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Cierra un <dialog> cuando se hace clic en el fondo oscuro.
 * Si el clic cae en el fondo, e.target es el propio <dialog>;
 * si cae en el contenido, e.target es un elemento de adentro.
 *
 * También se revisa dónde se HUNDIÓ el botón del mouse (mousedown): si el usuario
 * empezó a seleccionar texto adentro y soltó afuera, el modal no se cierra.
 */
export function closeOnBackdrop(dialog, onClose) {
  let pressedOnBackdrop = false;
  dialog.addEventListener('mousedown', (e) => {
    pressedOnBackdrop = e.target === dialog;
  });
  dialog.addEventListener('click', (e) => {
    if (pressedOnBackdrop && e.target === dialog) onClose();
    pressedOnBackdrop = false;
  });
}
