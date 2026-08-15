import { useEffect, useMemo, useRef, useState } from 'react';
import { useBodyScrollLock } from '@timeliber/kit';
import { ChevronDown, MapPinned, Search, X } from 'lucide-react';
import type { HumanitarianRegion } from '../../entities/incident';

interface Props {
  regions: readonly HumanitarianRegion[];
  selected: HumanitarianRegion;
  onSelect: (regionId: string) => void;
  onOverview: () => void;
}

export function TerritoryExplorer({ regions, selected, onSelect, onOverview }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const normalized = query.trim().toLocaleLowerCase('es');
  const visible = useMemo(
    () =>
      regions.filter(
        (region) =>
          (!onlyActive || region.hasActivity) &&
          (!normalized ||
            `${region.name} ${region.department}`.toLocaleLowerCase('es').includes(normalized)),
      ),
    [regions, normalized, onlyActive],
  );
  const departments = useMemo(
    () =>
      [...new Set(visible.map((region) => region.department))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [visible],
  );
  const activeCount = regions.filter((region) => region.hasActivity).length;

  function closeExplorer(restoreFocus = true) {
    setOpen(false);
    setQuery('');
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function choose(regionId: string) {
    onSelect(regionId);
    closeExplorer();
  }

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeExplorer();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])',
        ),
      ].filter((item) => item.offsetParent !== null || item === document.activeElement);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="territory-trigger"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <MapPinned size={18} />
        <span>
          <small>Municipio</small>
          <strong>
            {selected.name}, {selected.department}
          </strong>
        </span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div
          className="territory-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeExplorer();
          }}
        >
          <section
            aria-labelledby="territory-title"
            aria-modal="true"
            className="territory-dialog"
            ref={dialogRef}
            role="dialog"
          >
            <header>
              <div>
                <p className="eyebrow">Explorar Colombia</p>
                <h2 id="territory-title">¿Dónde necesitas ayuda?</h2>
                <p>
                  {activeCount > 0
                    ? `${activeCount} ${activeCount === 1 ? 'municipio con información' : 'municipios con información'}`
                    : 'Elige tu municipio o pueblo'}
                </p>
              </div>
              <button aria-label="Cerrar municipios" onClick={() => closeExplorer()} type="button">
                <X />
              </button>
            </header>
            <button
              className="national-open"
              onClick={() => {
                closeExplorer(false);
                onOverview();
              }}
              type="button"
            >
              Ver panorama nacional
            </button>
            <label className="territory-search">
              <Search size={19} />
              <span className="sr-only">Buscar municipio, pueblo o departamento</span>
              <input
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar municipio o pueblo"
                type="search"
                value={query}
              />
            </label>
            {activeCount > 0 && (
              <label className="active-switch">
                <input
                  checked={onlyActive}
                  onChange={(event) => setOnlyActive(event.target.checked)}
                  type="checkbox"
                />
                <span>Mostrar sólo lugares con información</span>
              </label>
            )}
            <div className="territory-results">
              {departments.map((department) => (
                <section key={department}>
                  <h3>{department}</h3>
                  {visible
                    .filter((region) => region.department === department)
                    .map((region) => (
                      <button
                        aria-current={selected.id === region.id ? 'location' : undefined}
                        key={region.id}
                        onClick={() => choose(region.id)}
                        type="button"
                      >
                        <span>
                          <strong>{region.name}</strong>
                          <small>
                            {region.hasActivity
                              ? 'Información disponible'
                              : 'Aún no hay publicaciones'}
                          </small>
                        </span>
                        <span
                          className={
                            region.hasActivity
                              ? 'territory-activity territory-activity--active'
                              : 'territory-activity'
                          }
                        >
                          {region.hasActivity ? 'Ver información' : 'Puedes publicar'}
                        </span>
                      </button>
                    ))}
                </section>
              ))}
              {visible.length === 0 && (
                <p className="empty-state">No encontramos ese lugar. Prueba con otro nombre.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
