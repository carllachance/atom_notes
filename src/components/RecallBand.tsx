type RecallBandProps = {
  count: number;
  archivedCount: number;
  quickCaptureOpen: boolean;
  onToggleQuickCapture: () => void;
};

export function RecallBand({
  count,
  archivedCount,
  quickCaptureOpen,
  onToggleQuickCapture
}: RecallBandProps) {
  return (
    <header className="recall-band">
      <h1>Atom Notes</h1>
      <div className="recall-meta">
        <span>{count} active</span>
        <span>{archivedCount} archived</span>
      </div>
      <button onClick={onToggleQuickCapture}>
        {quickCaptureOpen ? 'Dismiss Capture' : 'Summon Capture'}
      </button>
    </header>
  );
}
