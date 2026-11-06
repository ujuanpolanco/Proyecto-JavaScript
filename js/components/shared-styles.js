/**
 * Estilos compartidos entre componentes (botones, modales, utilidades).
 * Responsable: Juan
 *
 * El Shadow DOM aísla los estilos: el CSS de afuera no entra al componente.
 * Por eso estos estilos se guardan como texto y cada componente los pega dentro
 * de su <style>, por ejemplo: <style>${baseCss} ...estilos propios... </style>.
 *
 * Los colores vienen de las variables CSS de css/global.css. Las variables CSS
 * sí atraviesan el Shadow DOM, por eso todos los componentes comparten el tema.
 */
export const baseCss = `
  :host { box-sizing: border-box; font-family: var(--font-sans); color: var(--color-text); }
  *, *::before, *::after { box-sizing: inherit; }
  [hidden] { display: none !important; }

  /* Texto solo para lectores de pantalla (invisible en la pantalla). */
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
    min-height: 2.5rem; padding: .5rem 1rem;
    border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
    background: var(--color-surface); color: var(--color-text);
    font: inherit; font-size: .9375rem; font-weight: 600; line-height: 1.2;
    cursor: pointer; white-space: nowrap;
    transition: background-color .15s, border-color .15s, color .15s;
  }
  .btn:hover:not(:disabled) { background: var(--color-surface-hover); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn svg { width: 1.125rem; height: 1.125rem; flex: none; }

  .btn--primary { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }
  .btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); border-color: var(--color-primary-hover); }

  .btn--danger { color: var(--color-danger); border-color: var(--color-danger-border); }
  .btn--danger:hover:not(:disabled) { background: var(--color-danger-soft); }
  .btn--danger-solid { background: var(--color-danger); border-color: var(--color-danger); color: var(--color-on-danger); }
  .btn--danger-solid:hover:not(:disabled) { background: var(--color-danger-hover); border-color: var(--color-danger-hover); }

  .btn--ghost { background: transparent; border-color: transparent; color: var(--color-text-muted); }
  .btn--ghost:hover:not(:disabled) { color: var(--color-text); }
  .icon-btn { width: 2.5rem; padding: 0; }

  /* Si la persona pidió menos movimiento en su sistema, se quitan animaciones y transiciones. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }

  /* Contorno visible cuando se navega con el teclado. */
  .btn:focus-visible, input:focus-visible, select:focus-visible {
    outline: 3px solid var(--color-focus); outline-offset: 2px;
  }
`;

export const dialogCss = `
  dialog {
    border: none; padding: 0;
    width: min(560px, calc(100vw - 2rem)); max-width: calc(100vw - 2rem);
    max-height: min(90vh, 760px);
    max-height: min(90dvh, 760px); /* dvh descuenta la barra del navegador en el celular */
    border-radius: var(--radius-lg);
    background: var(--color-surface); color: var(--color-text);
    box-shadow: var(--shadow-lg);
  }
  dialog[open] { display: flex; flex-direction: column; animation: dialog-in .18s ease-out; }
  dialog::backdrop { background: rgb(15 23 42 / .55); }
  dialog > form { display: contents; }

  .dialog__header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
    padding: 1.25rem 1.5rem .25rem;
  }
  .dialog__title { margin: 0; font-size: 1.25rem; line-height: 1.3; }
  .dialog__subtitle { margin: .25rem 0 0; color: var(--color-text-muted); font-size: .875rem; }
  .dialog__body { padding: 1rem 1.5rem; overflow: auto; flex: 1; }
  .dialog__footer {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: .5rem;
    padding: 1rem 1.5rem 1.25rem; border-top: 1px solid var(--color-border);
  }

  /* En el celular el modal sale desde abajo y ocupa todo el ancho. */
  @media (max-width: 560px) {
    dialog {
      width: 100vw; max-width: 100vw; max-height: 92vh; max-height: 92dvh;
      margin: auto 0 0; border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }
    .dialog__header, .dialog__body, .dialog__footer { padding-inline: 1rem; }
    .dialog__footer .btn { flex: 1; }
  }

  @keyframes dialog-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
`;
