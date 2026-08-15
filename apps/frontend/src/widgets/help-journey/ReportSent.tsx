import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { ReportKind } from './report-kind';

interface ReportSentProps {
  kind: ReportKind;
  code: string | null;
  onClose: () => void;
}

/** El acuse: el código es el único comprobante de quien envía sin cuenta. */
export function ReportSent({ kind, code, onClose }: ReportSentProps) {
  const [codeCopied, setCodeCopied] = useState(false);

  return (
    <div className="report-sent">
      <ShieldCheck size={36} />
      <h2 id="journey-title">{kind === 'need' ? 'Ya la recibimos' : 'Ya lo recibimos'}</h2>
      <p>Guarda este código para saber cómo va:</p>
      <strong className="tracking-code">{code}</strong>
      <div className="code-actions">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code ?? '').then(() => {
              setCodeCopied(true);
              window.setTimeout(() => setCodeCopied(false), 1800);
            });
          }}
          type="button"
        >
          {codeCopied ? 'Código copiado' : 'Copiar código'}
        </button>
        <a
          href={
            'https://wa.me/?text=' +
            encodeURIComponent(
              'Mi código en Ayuda Colombia es ' + code + '. ' + window.location.origin,
            )
          }
          rel="noreferrer"
          target="_blank"
        >
          Enviar por WhatsApp
        </a>
      </div>
      <p>
        {kind === 'need'
          ? 'Te llamamos al número que dejaste. Si hay peligro ahora, llama al 123.'
          : 'Lo revisamos y, si se confirma, aparecerá en el mapa.'}
      </p>
      <button className="journey-map-link" onClick={onClose} type="button">
        Terminar
      </button>
    </div>
  );
}
