import { type FormEvent } from 'react';
import type { ManagedCenter } from '../../shared/api/coordination';

interface InviteOperatorProps {
  busy: boolean;
  invitation: string;
  centers: ManagedCenter[];
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
}

/** Dar acceso a quien atiende un centro, sin que tenga que pasar por nosotros. */
export function InviteOperator({ busy, invitation, centers, onInvite }: InviteOperatorProps) {
  return (
    <section className="coordination-card">
      <div className="coordination-intro">
        <p className="eyebrow">Usuarios y accesos</p>
        <h2>Dar acceso a un responsable</h2>
        <p>Elige el lugar y genera un enlace. La persona creará su propia contraseña.</p>
      </div>
      <form className="simple-form" onSubmit={onInvite}>
        <label>
          Centro o albergue
          <select name="centerId" required>
            <option value="">Selecciona un lugar</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre de la persona
          <input autoComplete="name" maxLength={160} minLength={2} name="displayName" required />
        </label>
        <label>
          Correo
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <button className="primary-submit" disabled={busy || centers.length === 0} type="submit">
          {busy ? 'Generando…' : 'Generar invitación'}
        </button>
        {invitation && (
          <div className="invite-result" role="status">
            <strong>Invitación lista por 24 horas</strong>
            <p>Comparte este enlace únicamente con la persona autorizada.</p>
            <input aria-label="Enlace de invitación" readOnly value={invitation} />
            <button onClick={() => navigator.clipboard?.writeText(invitation)} type="button">
              Copiar enlace
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
