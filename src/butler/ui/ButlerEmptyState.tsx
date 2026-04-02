export function ButlerEmptyState() {
  return (
    <div className="butler-queue__empty">
      <strong>No delegation items yet.</strong>
      <p>Hand off an outcome here and the Butler will stage reversible work for review instead of pretending it acted externally.</p>
    </div>
  );
}
