import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { HumanitarianRegion, MapCategory } from '../../entities/incident';
import { linesForTerritory } from '../../shared/data/emergency-lines';
import { RELIEF_ITEMS } from '../../shared/data/relief-items';
import { loadSubmissionStatus, submitPublicInformation } from '../../shared/api/submissions';
import {
  clearPendingSubmission,
  savePendingSubmission,
} from '../../shared/offline/secure-submission-outbox';
import { saveTrackingCode, type SavedTrackingCode } from '../../shared/offline/last-tracking-code';
import { useBodyScrollLock } from '../../shared/hooks/use-body-scroll-lock';
import type { HelpJourney } from '../home-primary-actions';
import { JourneyMenus } from './JourneyMenus';
import { ReportForm } from './ReportForm';
import type { ReportKind } from './report-kind';

interface HelpJourneyPanelProps {
  activeJourney: HelpJourney;
  onChangeJourney: (journey: HelpJourney) => void;
  onClose: () => void;
  onShowMap: (layers: MapCategory[], query?: string) => void;
  onTracked: (code: SavedTrackingCode) => void;
  onOutboxNotice: (message: string) => void;
  region: HumanitarianRegion;
  counts: Record<MapCategory, number>;
  publicDataLoaded: boolean;
  savedCode: SavedTrackingCode | null;
}

/**
 * Todo lo que ocurre dentro del panel: los tres recorridos, los formularios de publicación,
 * la revisión y la consulta por código. Vive aparte de la portada porque su estado
 * —borrador, envío, código— no le interesa a nadie más.
 */
export function HelpJourneyPanel({
  activeJourney,
  onChangeJourney,
  onClose,
  onShowMap,
  onTracked,
  onOutboxNotice,
  region,
  counts,
  publicDataLoaded,
  savedCode,
}: HelpJourneyPanelProps) {
  const [reportKind, setReportKind] = useState<ReportKind | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  const closeJourney = () => {
    setReportKind(null);
    onClose();
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useBodyScrollLock(true);
  useEffect(() => {
    const panel = panelRef.current;
    const selector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href]';
    (panel?.querySelector(selector) as HTMLElement | null)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeJourney();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(selector)].filter(
        (item) => item.offsetParent !== null || item === document.activeElement,
      );
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
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJourney]);

  return (
    <div
      className="journey-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeJourney();
      }}
    >
      <section
        aria-labelledby="journey-title"
        aria-modal="true"
        className="journey-panel"
        id="journey-panel"
        ref={panelRef}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="journey-close" onClick={closeJourney} type="button">
          <ArrowLeft size={19} /> Volver
        </button>
        {activeJourney !== 'report' && !publicDataLoaded && (
          <p className="journey-notice" role="status">
            Consultando información…
          </p>
        )}{' '}
        <JourneyMenus
          activeJourney={activeJourney}
          counts={counts}
          onChangeJourney={onChangeJourney}
          onPickKind={setReportKind}
          onShowMap={onShowMap}
          pickedKind={reportKind}
          savedCode={savedCode}
          publicDataLoaded={publicDataLoaded}
          region={region}
        />
        {activeJourney === 'report' && reportKind && (
          <ReportForm
            kind={reportKind}
            onChangeKind={setReportKind}
            onClose={closeJourney}
            onOutboxNotice={onOutboxNotice}
            onTracked={onTracked}
            region={region}
            savedCode={savedCode}
          />
        )}
      </section>
    </div>
  );
}
