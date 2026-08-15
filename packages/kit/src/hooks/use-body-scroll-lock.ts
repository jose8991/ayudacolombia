import { useEffect } from 'react';

/**
 * Impide que la página de fondo se desplace mientras hay un panel abierto. En móvil, sin
 * esto, cerrar un formulario devuelve a la persona a un punto distinto del que dejó.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
