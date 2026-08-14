import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { HumanitarianRegion } from '../../entities/incident';

const NationalMap = lazy(() =>
  import('../../widgets/national-map').then((module) => ({ default: module.NationalMap })),
);
const DepartmentMap = lazy(() =>
  import('../../widgets/department-map').then((module) => ({ default: module.DepartmentMap })),
);

export function NationalOverview({
  regions,
  onChoose,
  onClose,
}: {
  regions: readonly HumanitarianRegion[];
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const [department, setDepartment] = useState<string | null>(null);
  const active = regions.filter((region) => region.hasActivity);
  const departmentNames = useMemo(
    () =>
      [...new Set(regions.map((region) => region.department))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [regions],
  );
  const scoped = department ? regions.filter((region) => region.department === department) : [];
  const loading = (
    <div className="national-map map-loading" role="status">
      Cargando mapa…
    </div>
  );
  return (
    <section
      aria-labelledby="national-title"
      aria-modal="true"
      className="national-overview"
      role="dialog"
    >
      <header>
        <div>
          {department && (
            <button
              aria-label="Volver a Colombia"
              className="national-back"
              onClick={() => setDepartment(null)}
              type="button"
            >
              <ArrowLeft />
            </button>
          )}
          <p className="eyebrow">{department ? `Colombia / ${department}` : 'Colombia'}</p>
          <h2 id="national-title">
            {department ? `Municipios de ${department}` : 'Panorama nacional'}
          </h2>
          <p>
            {department
              ? `${scoped.length} municipios disponibles`
              : `${active.length} regiones con información publicada`}
          </p>
        </div>
        <button aria-label="Cerrar panorama nacional" onClick={onClose} type="button">
          <X />
        </button>
      </header>
      <div className="national-layout">
        <aside>
          <h3>{department ? 'Selecciona un municipio' : 'Explorar departamentos'}</h3>
          <p>
            {department
              ? 'Los municipios resaltados tienen información disponible.'
              : 'Selecciona en la lista o directamente en el mapa.'}
          </p>
          {department
            ? scoped.map((region) => (
                <button
                  className={region.hasActivity ? 'is-active' : ''}
                  key={region.id}
                  onClick={() => onChoose(region.id)}
                  type="button"
                >
                  <span>
                    <strong>{region.name}</strong>
                    <small>
                      {region.hasActivity ? 'Información disponible' : 'Sin información publicada'}
                    </small>
                  </span>
                  <span>{region.hasActivity ? 'Ver información' : 'Sin datos publicados'}</span>
                </button>
              ))
            : departmentNames.map((name) => {
                const children = regions.filter((region) => region.department === name);
                const hasActivity = children.some((region) => region.hasActivity);
                return (
                  <button
                    className={hasActivity ? 'is-active' : ''}
                    key={name}
                    onClick={() => setDepartment(name)}
                    type="button"
                  >
                    <span>
                      <strong>{name}</strong>
                      <small>{children.length} municipios disponibles</small>
                    </span>
                    <span>{hasActivity ? 'Información disponible' : 'Sin datos publicados'}</span>
                  </button>
                );
              })}
          <small>Fuente cartográfica: DANE, Marco Geoestadístico Nacional 2025.</small>
        </aside>
        {department ? (
          <Suspense fallback={loading}>
            <DepartmentMap department={department} onChoose={onChoose} regions={regions} />
          </Suspense>
        ) : (
          <Suspense fallback={loading}>
            <NationalMap onChooseDepartment={setDepartment} regions={regions} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
