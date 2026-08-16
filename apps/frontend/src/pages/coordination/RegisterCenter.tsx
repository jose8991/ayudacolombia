import { useEffect, useState, type FormEvent } from 'react';
import { MapPin } from 'lucide-react';
import { createCenter, type Session } from '../../shared/api/coordination';
import { loadPublicRegions } from '../../shared/api/territories';
import type { HumanitarianRegion } from '../../entities/incident';

/** Lo que puede recibir un lugar. Alojamiento va aparte: no es una donación. */
const ACCEPTED = [
  'Alojamiento temporal',
  'Agua',
  'Alimentos',
  'Colchonetas',
  'Cobijas',
  'Aseo personal',
  'Pañales',
  'Ropa',
  'Medicamentos',
] as const;

const STATUSES = [
  { value: 'open', label: 'Abierto y recibiendo' },
  { value: 'almost_full', label: 'Casi lleno' },
  { value: 'do_not_send', label: 'No enviar más por ahora' },
  { value: 'closed', label: 'Cerrado' },
] as const;

interface RegisterCenterProps {
  session: Session;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onCreated: () => void;
}

/**
 * Registrar un albergue o punto de acopio desde la interfaz.
 *
 * La ubicación se toma del dispositivo, estando en el lugar. Es a propósito: escribir
 * coordenadas a mano o deducirlas de una dirección es la forma más fácil de mandar gente
 * a la cuadra equivocada, y aquí eso se paga caro.
 */
export function RegisterCenter({ session, busy, onBusy, onCreated }: RegisterCenterProps) {
  const [regions, setRegions] = useState<HumanitarianRegion[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');

  const esAdministrador = session.actor.roles.includes('administrator');

  useEffect(() => {
    loadPublicRegions()
      .then((all) =>
        setRegions(
          esAdministrador
            ? all
            : all.filter((region) => session.actor.territory_ids.includes(region.id)),
        ),
      )
      .catch(() => setRegions([]));
  }, [esAdministrador, session.actor.territory_ids]);

  function tomarUbicacion() {
    if (!navigator.geolocation) {
      setError('Este dispositivo no puede darnos la ubicación.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('No pudimos tomar la ubicación. Debes estar en el lugar y dar permiso.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const organizacion = session.actor.organization_id;
    if (!organizacion || !coords) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    onBusy(true);
    setError('');
    try {
      const center = await createCenter(session.access_token, {
        organization_id: organizacion,
        territory_id: String(data.get('territory')),
        name: String(data.get('name')),
        address: String(data.get('address')),
        latitude: coords.latitude,
        longitude: coords.longitude,
        status: String(data.get('status')) as 'open',
        schedule: String(data.get('schedule')) || null,
        accepted_items: data.getAll('accepted').map(String),
      });
      form.reset();
      setCoords(null);
      setCreated(center.name);
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible registrar el lugar');
    } finally {
      onBusy(false);
    }
  }

  if (!session.actor.organization_id) return null;

  return (
    <section className="coordination-card">
      <div className="coordination-intro">
        <span className="coordination-icon">
          <MapPin />
        </span>
        <p className="eyebrow">Albergues y acopios</p>
        <h2>Registrar un lugar</h2>
        <p>Aparecerá en el mapa público con el nivel de confianza de tu organización.</p>
      </div>
      <form className="simple-form" onSubmit={handleSubmit}>
        <label>
          Nombre del lugar
          <input
            maxLength={160}
            minLength={3}
            name="name"
            placeholder="Ej. Albergue Parque El Vergel"
            required
          />
        </label>
        <label>
          Dirección
          <input
            maxLength={255}
            minLength={3}
            name="address"
            placeholder="Ej. Carrera 8 con calle 20, barrio Centro"
            required
          />
        </label>
        <label>
          Municipio
          <select name="territory" required>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </label>
        <div className="location-capture">
          <button disabled={locating} onClick={tomarUbicacion} type="button">
            {locating ? 'Tomando ubicación…' : 'Tomar la ubicación aquí'}
          </button>
          {coords ? (
            <p role="status">
              Ubicación tomada: {coords.latitude}, {coords.longitude}
            </p>
          ) : (
            <small>Debes estar en el lugar. No se escriben coordenadas a mano.</small>
          )}
        </div>
        <fieldset className="priority-picker">
          <legend>¿Cómo está ahora?</legend>
          {STATUSES.map((status, index) => (
            <label key={status.value}>
              <input defaultChecked={index === 0} name="status" type="radio" value={status.value} />{' '}
              {status.label}
            </label>
          ))}
        </fieldset>
        <fieldset className="item-picker">
          <legend>¿Qué recibe o entrega?</legend>
          {ACCEPTED.map((item) => (
            <label key={item}>
              <input name="accepted" type="checkbox" value={item} />
              <span>{item}</span>
            </label>
          ))}
        </fieldset>
        <label>
          Horario o instrucción
          <input
            maxLength={255}
            name="schedule"
            placeholder="Ej. 8 a. m. a 6 p. m., entrada por la portería"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {created && (
          <div className="publish-success" role="status">
            <div>
              <strong>{created} quedó registrado</strong>
              <span>Ya puede verse en el mapa público.</span>
            </div>
            <a href="/">Ver en el mapa</a>
          </div>
        )}
        <button className="primary-submit" disabled={busy || !coords} type="submit">
          {busy ? 'Registrando…' : 'Registrar el lugar'}
        </button>
      </form>
    </section>
  );
}
