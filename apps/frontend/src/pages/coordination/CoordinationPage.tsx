import { type FormEvent, useState } from 'react';
import { RELIEF_ITEMS } from '../../shared/data/relief-items';
import { ModerationList } from './ModerationList';
import { InviteOperator } from './InviteOperator';
import { formatFreshness } from '../../shared/format/freshness';
import { VALIDITY_OPTIONS, expiresAt } from '../../shared/format/expiry';
import {
  ArrowLeft,
  CheckCircle2,
  LogIn,
  Megaphone,
  PackagePlus,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import {
  acceptInvitation,
  inviteCenterOperator,
  loadManagedCenters,
  loadPendingReports,
  markReportContacted,
  login,
  moderateReport,
  publishCenterUpdate,
  type ManagedCenter,
  type PendingReport,
  type Session,
} from '../../shared/api/coordination';

export function CoordinationPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [centers, setCenters] = useState<ManagedCenter[]>([]);
  const [centerId, setCenterId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(false);
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const invitationToken = new URLSearchParams(window.location.search).get('invite');
  const canModerate =
    session?.actor.roles.some((role) =>
      ['verifier', 'territorial_coordinator', 'official', 'administrator'].includes(role),
    ) ?? false;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const nextSession = await login(String(data.get('email')), String(data.get('password')));
      const nextCenters = await loadManagedCenters(nextSession.access_token);
      const reviewRoles = ['verifier', 'territorial_coordinator', 'official', 'administrator'];
      const nextReports = nextSession.actor.roles.some((role) => reviewRoles.includes(role))
        ? await loadPendingReports(nextSession.access_token)
        : [];
      setSession(nextSession);
      setCenters(nextCenters);
      setReports(nextReports);
      setCenterId(nextCenters[0]?.id ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !centerId) return;
    setBusy(true);
    setError('');
    setPublished(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    const needed = data.getAll('needed').map(String);
    const sufficient = data.getAll('sufficient').map(String);
    if (needed.length === 0 && sufficient.length === 0) {
      setBusy(false);
      setError('Marque al menos un artículo, en una lista o en la otra.');
      return;
    }
    const title = needed.length
      ? 'Necesitamos ' + needed.join(', ').toLocaleLowerCase('es')
      : 'Ya tenemos suficiente ' + sufficient.join(', ').toLocaleLowerCase('es');
    try {
      await publishCenterUpdate(session.access_token, centerId, {
        title,
        message: String(data.get('message')),
        needed_items: needed,
        sufficient_items: sufficient,
        priority: String(data.get('priority')) as 'normal' | 'high' | 'urgent',
        expires_at: expiresAt(String(data.get('validity'))),
      });
      form.reset();
      setCenterId(centerId);
      setPublished(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible publicar');
    } finally {
      setBusy(false);
    }
  }

  async function handleModerate(reportId: string, verificationStatus: 'verified' | 'rejected') {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      await moderateReport(session.access_token, reportId, verificationStatus);
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible revisar el reporte');
    } finally {
      setBusy(false);
    }
  }

  async function handleContacted(reportId: string) {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const updated = await markReportContacted(session.access_token, reportId);
      setReports((current) => current.map((report) => (report.id === reportId ? updated : report)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible marcar el contacto');
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError('');
    setInviteLink('');
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const invitation = await inviteCenterOperator(session.access_token, {
        email: String(data.get('email')),
        display_name: String(data.get('displayName')),
        center_id: String(data.get('centerId')),
      });
      setInviteLink(
        window.location.origin + '/coordina?invite=' + encodeURIComponent(invitation.token),
      );
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear la invitación');
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitationToken) return;
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    if (password !== String(data.get('confirmPassword'))) {
      setError('Las contraseñas no coinciden');
      setBusy(false);
      return;
    }
    try {
      const nextSession = await acceptInvitation(invitationToken, password);
      setSession(nextSession);
      setCenters(await loadManagedCenters(nextSession.access_token));
      window.history.replaceState({}, '', '/coordina');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible activar la cuenta');
    } finally {
      setBusy(false);
    }
  }

  if (invitationToken && !session)
    return (
      <main className="coordination-page">
        <header className="coordination-header">
          <a href="/">
            <ArrowLeft size={18} /> Volver
          </a>
          <span>
            <ShieldCheck size={18} /> Invitación segura
          </span>
        </header>
        <section className="coordination-card">
          <div className="coordination-intro">
            <p className="eyebrow">Acceso a un lugar de ayuda</p>
            <h1>Crea tu contraseña</h1>
            <p>Tu cuenta solo tendrá acceso al centro o albergue que te asignaron.</p>
          </div>
          <form className="simple-form" onSubmit={handleAcceptInvitation}>
            <label>
              Contraseña <span>Usa al menos 12 caracteres</span>
              <input
                autoComplete="new-password"
                minLength={12}
                name="password"
                required
                type="password"
              />
            </label>
            <label>
              Repite la contraseña
              <input
                autoComplete="new-password"
                minLength={12}
                name="confirmPassword"
                required
                type="password"
              />
            </label>
            <label className="privacy-consent">
              <input name="privacyConsent" required type="checkbox" />
              <span>
                Autorizo el tratamiento de mis datos para administrar el lugar asignado.{' '}
                <a href="/tratamiento-de-datos" rel="noreferrer" target="_blank">
                  Ver política
                </a>
                .
              </span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-submit" disabled={busy} type="submit">
              {busy ? 'Activando…' : 'Activar mi cuenta'}
            </button>
          </form>
        </section>
      </main>
    );

  return (
    <main className="coordination-page">
      <header className="coordination-header">
        <a href="/">
          <ArrowLeft size={18} /> Volver al mapa
        </a>
        <span>
          <ShieldCheck size={18} /> Área autorizada
        </span>
      </header>
      <section className="coordination-card">
        <div className="coordination-intro">
          <span className="coordination-icon">
            <Megaphone />
          </span>
          <p className="eyebrow">Centros de ayuda</p>
          <h1>Publicar una actualización</h1>
          <p>Lo que publiques podrá verlo cualquier persona en el mapa, sin registrarse.</p>
        </div>
        {!session ? (
          <form className="simple-form" onSubmit={handleLogin}>
            <h2>
              <LogIn size={20} /> Iniciar sesión
            </h2>
            <label>
              Correo
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <label>
              Contraseña
              <input
                autoComplete="current-password"
                minLength={12}
                name="password"
                required
                type="password"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-submit" disabled={busy} type="submit">
              {busy ? 'Ingresando…' : 'Continuar'}
            </button>
          </form>
        ) : (
          <form className="simple-form" onSubmit={handlePublish}>
            <p className="signed-user">
              Sesión de <strong>{session.actor.display_name}</strong>
            </p>
            {centers.length === 0 ? (
              <p className="form-empty">
                No tienes centros asignados. Solicita acceso a coordinación.
              </p>
            ) : (
              <>
                <label>
                  Centro
                  <select
                    name="center"
                    onChange={(event) => setCenterId(event.target.value)}
                    required
                    value={centerId}
                  >
                    {centers.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="item-picker">
                  <legend>¿Qué les hace falta?</legend>
                  {RELIEF_ITEMS.map((item) => (
                    <label key={'need-' + item}>
                      <input name="needed" type="checkbox" value={item} />
                      <span>{item}</span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="item-picker item-picker--enough">
                  <legend>¿De qué ya tienen suficiente?</legend>
                  {RELIEF_ITEMS.map((item) => (
                    <label key={'enough-' + item}>
                      <input name="sufficient" type="checkbox" value={item} />
                      <span>{item}</span>
                    </label>
                  ))}
                </fieldset>
                <label>
                  Cuéntelo en una frase
                  <textarea
                    maxLength={800}
                    name="message"
                    placeholder="Ej. Recibimos hasta las 6 p. m. en la entrada principal"
                    required
                    rows={3}
                  />
                </label>
                <fieldset className="priority-picker">
                  <legend>¿Hasta cuándo vale?</legend>
                  {VALIDITY_OPTIONS.map((option, index) => (
                    <label key={option.value}>
                      <input
                        defaultChecked={index === 0}
                        name="validity"
                        type="radio"
                        value={option.value}
                      />{' '}
                      {option.label}
                    </label>
                  ))}
                </fieldset>
                <fieldset className="priority-picker">
                  <legend>Prioridad</legend>
                  <label>
                    <input defaultChecked name="priority" type="radio" value="normal" /> Normal
                  </label>
                  <label>
                    <input name="priority" type="radio" value="high" /> Alta
                  </label>
                  <label>
                    <input name="priority" type="radio" value="urgent" /> Urgente
                  </label>
                </fieldset>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                {published && (
                  <div className="publish-success" role="status">
                    <CheckCircle2 />
                    <div>
                      <strong>Publicado correctamente</strong>
                      <span>Ya puede verse en el mapa público.</span>
                    </div>
                    <a href="/">Ver en el mapa</a>
                  </div>
                )}
                <button className="primary-submit" disabled={busy} type="submit">
                  <PackagePlus size={19} />
                  {busy ? 'Publicando…' : 'Publicar en el mapa'}
                </button>
              </>
            )}
          </form>
        )}
      </section>
      {session && canModerate && (
        <ModerationList
          busy={busy}
          onContacted={(id) => void handleContacted(id)}
          onModerate={handleModerate}
          reports={reports}
        />
      )}
      {session?.actor.roles.includes('administrator') && (
        <InviteOperator
          busy={busy}
          centers={centers}
          invitation={inviteLink}
          onInvite={handleInvite}
        />
      )}
    </main>
  );
}
