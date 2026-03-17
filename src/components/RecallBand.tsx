type RecallBandProps = {
  activeCount: number;
  archivedCount: number;
  onQuickCapture: () => void;
};

export function RecallBand({ activeCount, archivedCount, onQuickCapture }: RecallBandProps) {
  return (
    <header className="recall-band">
      <h1>Atom Notes · Thinking Surface</h1>
      <div className="recall-stats">
        <span>Active: {activeCount}</span>
        <span>Archived: {archivedCount}</span>
      </div>
      <button onClick={onQuickCapture}>Quick Capture (Ctrl+Shift+N)</button>
    </header>
  );
}
