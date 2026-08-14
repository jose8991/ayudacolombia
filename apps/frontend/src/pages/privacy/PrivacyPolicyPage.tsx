import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <main className="privacy-page" id="main-content">
      <header>
        <a href="/">
          <ArrowLeft size={18} /> Volver a Ayuda Colombia
        </a>
      </header>
      <article>
        <p className="eyebrow">Versión 2026-08-13</p>
        <h1>Tratamiento de datos personales</h1>
        <p className="privacy-summary">
          <ShieldCheck /> Usamos la información únicamente para coordinar ayuda, verificar reportes
          y administrar accesos autorizados.
        </p>

        <h2>Responsable del tratamiento</h2>
        <p>
          <strong>TIMELIBER S.A.S.</strong>, responsable de la plataforma Ayuda Colombia.
        </p>
        <p>
          Canal de privacidad:{' '}
          <a href="mailto:privacidad@ayudacolombia.com.co">privacidad@ayudacolombia.com.co</a>.
        </p>

        <h2>Qué datos podemos solicitar</h2>
        <p>
          Datos de contacto, ubicación, necesidad reportada y, para operadores, nombre, correo,
          organización y lugares asignados. Evita incluir documentos, historias clínicas o
          información de menores.
        </p>

        <h2>Para qué los usamos</h2>
        <ul>
          <li>Gestionar solicitudes y ofertas de ayuda.</li>
          <li>Contactar a la persona cuando sea necesario para coordinar la atención.</li>
          <li>Verificar información antes de publicarla.</li>
          <li>Autorizar y auditar el acceso de operadores.</li>
          <li>Proteger la plataforma y prevenir abusos.</li>
        </ul>

        <h2>Qué se muestra públicamente</h2>
        <p>
          El contacto, la identidad de quien solicita ayuda y la ubicación residencial exacta no se
          publican. Los reportes solo pueden aparecer después de revisión y con una ubicación
          generalizada cuando corresponda.
        </p>

        <h2>Quién puede acceder</h2>
        <p>
          Solo personal y organizaciones autorizadas, limitado al municipio, organización o centro
          que tengan asignado. No vendemos datos ni los usamos para publicidad.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes conocer, actualizar, corregir o solicitar la supresión de tus datos, pedir prueba
          de la autorización y consultar el uso realizado.
        </p>

        <h2>Consultas y reclamos</h2>
        <p>
          Escribe a{' '}
          <a href="mailto:privacidad@ayudacolombia.com.co">privacidad@ayudacolombia.com.co</a>{' '}
          indicando tu solicitud y un medio para responderte. TIMELIBER S.A.S. verificará tu
          identidad y tramitará la solicitud dentro de los términos legales aplicables.
        </p>

        <section className="policy-blocker" role="note">
          <strong>Información legal pendiente antes de producción</strong>
          <p>
            Falta incorporar el NIT, domicilio, dirección, teléfono y los periodos aprobados de
            conservación de TIMELIBER S.A.S. La política debe recibir revisión jurídica antes de
            publicarse como versión definitiva.
          </p>
        </section>
      </article>
    </main>
  );
}
