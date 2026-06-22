import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { relativeTime, type Alert } from '../mock-data';
import { SceneCanvas } from '../scenes/SceneCanvas';
import { PlaneInStorm } from '../scenes/PlaneInStorm';
import { PALETTE } from '../theme';
import type { FocusPose, PlaneMotion, PlaneTrim } from '../stage/focusPose';
import { MONO, TXT } from './AlertDetail.constants';
import { logisticsRows } from './AlertDetailLogistics';
import {
  FocusTuner,
  PlaneMotionTuner,
  PlaneTrimTuner
} from './AlertDetailTuners';

export function AlertDetailHeader({
  alert,
  onClose,
  tunable,
  tunerOpen,
  onToggleTuner
}: {
  alert: Alert;
  onClose: () => void;
  tunable: boolean;
  tunerOpen: boolean;
  onToggleTuner: () => void;
}) {
  return (
    <div className="shrink-0 pt-7 pb-4">
      <div className="flex items-start gap-2.5 px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="返回"
          className="mt-0.5 shrink-0 rounded-full p-1.5 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div
            className={`${TXT.label} flex items-center gap-2`}
            style={{ letterSpacing: '0.04em', textTransform: 'none' }}
          >
            <span className="tabular-nums">{relativeTime(alert.timestamp)}</span>
            <span>·</span>
            <span>{alert.meta}</span>
          </div>
          <h2 className="text-xl font-medium leading-tight tracking-tight text-white">
            {alert.title}
          </h2>
        </div>
        {tunable ? (
          <button
            type="button"
            onClick={onToggleTuner}
            aria-label="调焦"
            title="镜头取景调试"
            className={`mt-0.5 shrink-0 rounded-full p-1.5 transition-colors ${
              tunerOpen
                ? 'bg-white/12 text-white'
                : 'text-white/45 hover:bg-white/10 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TunerPanel({
  tunerOpen,
  focusPose,
  onFocusPoseChange,
  planeTrim,
  onPlaneTrimChange,
  planeMotion,
  onPlaneMotionChange
}: {
  tunerOpen: boolean;
  focusPose?: FocusPose;
  onFocusPoseChange?: (p: FocusPose) => void;
  planeTrim: PlaneTrim;
  onPlaneTrimChange?: (p: PlaneTrim) => void;
  planeMotion: PlaneMotion;
  onPlaneMotionChange?: (m: PlaneMotion) => void;
}) {
  if (
    !tunerOpen ||
    !focusPose ||
    !onFocusPoseChange ||
    !onPlaneTrimChange ||
    !onPlaneMotionChange
  ) {
    return null;
  }
  return (
    <>
      <FocusTuner pose={focusPose} onChange={onFocusPoseChange} />
      <PlaneTrimTuner trim={planeTrim} onChange={onPlaneTrimChange} />
      <PlaneMotionTuner value={planeMotion} onChange={onPlaneMotionChange} />
    </>
  );
}

export function ScenePanel({
  alert,
  isCrisis,
  sceneMode,
  planeMotion,
  planeTrim,
  resolving,
  sceneHudTopLeft,
  sceneHudTopRight
}: {
  alert: Alert;
  isCrisis: boolean;
  sceneMode: 'storm' | 'cruise' | 'landing';
  planeMotion: PlaneMotion;
  planeTrim: PlaneTrim;
  resolving: boolean;
  sceneHudTopLeft: [string, string];
  sceneHudTopRight: [string, string];
}) {
  return (
    <div
      className="relative mx-5 h-[300px] shrink-0 overflow-hidden rounded-2xl"
      style={{
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
        background: `
          radial-gradient(ellipse 50% 35% at 15% 25%, rgba(74, 70, 110, 0.35), transparent 70%),
          radial-gradient(ellipse 55% 40% at 85% 75%, rgba(60, 56, 95, 0.40), transparent 70%),
          radial-gradient(ellipse 45% 30% at 50% 0%, rgba(80, 75, 120, 0.28), transparent 70%),
          radial-gradient(ellipse 50% 35% at 50% 100%, rgba(50, 45, 85, 0.40), transparent 70%)
        `
      }}
    >
      <SceneCanvas
        camFov={planeMotion.camFov}
        camDist={planeMotion.camDist}
        mode={sceneMode}
        landCycleSecs={planeMotion.landCycleSecs}
      >
        <PlaneInStorm
          trim={planeTrim}
          motion={planeMotion}
          mode={sceneMode}
          resolving={resolving}
        />
      </SceneCanvas>
      <SceneHud
        topLeft={
          isCrisis
            ? sceneHudTopLeft
            : ['[ LOGISTICS ]', (alert.routeId ?? '').replace('-', ' ─ ').toUpperCase()]
        }
        topRight={isCrisis ? sceneHudTopRight : [alert.meta.toUpperCase(), 'ON SCHEDULE']}
      />
    </div>
  );
}

function SceneHud({
  topLeft,
  topRight
}: {
  topLeft: [string, string];
  topRight: [string, string];
}) {
  const shadow: React.CSSProperties = {
    textShadow: '0 0 6px rgba(120, 210, 255, 0.45)',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    userSelect: 'none'
  };
  return (
    <>
      <div
        className="pointer-events-none absolute top-3 left-4"
        style={shadow}
      >
        <div className="text-meta-key" style={{ letterSpacing: '0.22em' }}>
          {topLeft[0]}
        </div>
        <div className="text-meta-secondary" style={{ letterSpacing: '0.22em' }}>
          {topLeft[1]}
        </div>
      </div>
      <div
        className="pointer-events-none absolute top-3 right-4 text-right"
        style={shadow}
      >
        <div className="text-meta-key" style={{ letterSpacing: '0.22em' }}>
          {topRight[0]}
        </div>
        <div className="text-meta-secondary" style={{ letterSpacing: '0.22em' }}>
          {topRight[1]}
        </div>
      </div>
    </>
  );
}

export function NowEventSection({
  alert,
  arc,
  logiExpanded,
  onExpand,
  onCollapse
}: {
  alert: Alert;
  arc: boolean;
  logiExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  if (!alert.insight) return null;
  const logi = logisticsRows(alert);
  const logiPick = (k: string) => logi.find((r) => r.k === k)?.v ?? '';
  const logiSummary = [logiPick('运单'), logiPick('模式'), logiPick('货量')]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="mx-5">
      <Section label="现在事件">
        <p className={TXT.body}>{alert.insight}</p>
        <LogisticsGrid
          arc={arc}
          expanded={logiExpanded}
          rows={logi}
          summary={logiSummary}
          onExpand={onExpand}
          onCollapse={onCollapse}
        />
      </Section>
    </div>
  );
}

function LogisticsGrid({
  arc,
  expanded,
  rows,
  summary,
  onExpand,
  onCollapse
}: {
  arc: boolean;
  expanded: boolean;
  rows: { k: string; v: string }[];
  summary: string;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  if (arc && !expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
        style={{
          background: 'rgba(255,255,255,0.03)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)'
        }}
      >
        <span className={`truncate ${TXT.data}`} style={{ fontFamily: MONO }}>
          运单 {summary}
        </span>
        <span className={`${TXT.micro} shrink-0`}>明细 ›</span>
      </button>
    );
  }
  return (
    <div
      className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl p-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)'
      }}
    >
      {rows.map((r) => (
        <div key={r.k} className="flex items-baseline justify-between gap-3 tabular-nums">
          <span className={`${TXT.label} shrink-0`}>{r.k}</span>
          <span className={`truncate text-right ${TXT.data}`} style={{ fontFamily: MONO }}>
            {r.v}
          </span>
        </div>
      ))}
      {arc ? (
        <button
          type="button"
          onClick={onCollapse}
          className={`${TXT.micro} col-span-2 mt-1 text-right transition-colors hover:text-white/70`}
        >
          收起 ›
        </button>
      ) : null}
    </div>
  );
}

export function DownstreamSection({
  alert,
  arc
}: {
  alert: Alert;
  arc: boolean;
}) {
  if (!arc || !alert.downstream || alert.downstream.length === 0) return null;
  return (
    <div className="mx-5">
      <Section label="受影响下游">
        <ul className="flex flex-col gap-1.5">
          {alert.downstream.map((d) => (
            <li
              key={d}
              className={`flex items-baseline gap-2 ${TXT.data}`}
              style={{ fontFamily: MONO }}
            >
              <span style={{ color: PALETTE.magenta }}>›</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export function NormalEventFooter({
  alert,
  arc
}: {
  alert: Alert;
  arc: boolean;
}) {
  if (arc) return null;
  return (
    <>
      <div className="flex-1" />
      <footer
        className="text-meta-secondary flex items-center justify-between px-5"
        style={{ letterSpacing: '0.18em' }}
      >
        <span>ESC · 返回</span>
        {alert.routeId ? <span>ROUTE · {alert.routeId}</span> : null}
      </footer>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className={TXT.label}>{label}</span>
        <span
          className="h-px flex-1"
          style={{
            background: 'linear-gradient(90deg, rgba(180, 170, 255, 0.25), transparent)'
          }}
        />
      </div>
      {children}
    </div>
  );
}
