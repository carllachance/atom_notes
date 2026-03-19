import { REFINEMENT_PRESETS, RefinementPreset, RefinementPresetId, RefinementScope, RefinementSuggestion } from '../ai/refinement';

type RefinementComposerProps = {
  selectionActive: boolean;
  preview: RefinementSuggestion | null;
  previewDraft: string;
  customInstruction: string;
  onSelectPreset: (presetId: RefinementPresetId) => void;
  onCustomInstructionChange: (value: string) => void;
  onRunCustom: () => void;
  onPreviewDraftChange: (value: string) => void;
  onApplyReplace: () => void;
  onApplyInsertBelow: () => void;
  onCancelPreview: () => void;
};

function getScopeLabel(scope: RefinementScope) {
  return scope === 'selection' ? 'Selected text' : 'Current note';
}

const visiblePresets = REFINEMENT_PRESETS.filter((preset) => preset.id !== 'custom');

function RefinementIcon({ presetId }: { presetId: RefinementPresetId }) {
  switch (presetId) {
    case 'clarify':
      return <path d="M3 8h10M5 4.8h6M5 11.2h6" />;
    case 'executive_summary':
      return <path d="M4 4.5h8v7H4zM6 7.2h4M6 9.4h2.6" />;
    case 'summarize':
      return <path d="M4 4.5h8M4 8h8M4 11.5h5.2" />;
    case 'bulletize':
      return <path d="M4.2 5.2h.01M6.2 5.2H12M4.2 8h.01M6.2 8H12M4.2 10.8h.01M6.2 10.8H12" />;
    case 'meeting_minutes':
      return <path d="M4 4.5h8v7H4zM6 6.7h4M6 8.7h4" />;
    case 'study_guide':
      return <path d="M4.4 4.6h3.3a2 2 0 0 1 2 2v4.8H6.4a2 2 0 0 0-2 2zM11.6 4.6H8.3a2 2 0 0 0-2 2v4.8h3.3a2 2 0 0 1 2 2z" />;
    case 'legal_brief':
      return <path d="M8 4.3v7.4M5.5 6.2h5M4.6 11.4h6.8" />;
    default:
      return <path d="M4 8h8" />;
  }
}

function RefinementActionButton({ preset, onSelect }: { preset: RefinementPreset; onSelect: (presetId: RefinementPresetId) => void }) {
  return (
    <button
      type="button"
      className="ghost-button refinement-action-tile"
      onClick={() => onSelect(preset.id)}
      aria-label={`${preset.shortLabel}. ${preset.description}`}
    >
      <span className="refinement-action-tile__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25">
          <RefinementIcon presetId={preset.id} />
        </svg>
      </span>
      <span className="refinement-action-tile__label">{preset.shortLabel}</span>
      <span className="refinement-action-tile__tooltip" role="presentation">{preset.description}</span>
    </button>
  );
}

export function RefinementComposer({
  selectionActive,
  preview,
  previewDraft,
  customInstruction,
  onSelectPreset,
  onCustomInstructionChange,
  onRunCustom,
  onPreviewDraftChange,
  onApplyReplace,
  onApplyInsertBelow,
  onCancelPreview
}: RefinementComposerProps) {
  return (
    <section className="refinement-composer" aria-label="AI refinement">
      <div className="refinement-composer-head">
        <strong>Refine</strong>
        <span className={`refinement-scope-pill ${selectionActive ? 'active' : ''}`}>
          {selectionActive ? 'Selection' : 'Note'}
        </span>
      </div>

      <div className="refinement-action-grid" aria-label="AI refinement actions">
        {visiblePresets.map((preset) => (
          <RefinementActionButton key={preset.id} preset={preset} onSelect={onSelectPreset} />
        ))}
      </div>

      <div className="refinement-custom-row refinement-custom-row--simple">
        <input
          aria-label="Custom AI format instruction"
          placeholder="e.g. Rewrite for exec review"
          value={customInstruction}
          onChange={(event) => onCustomInstructionChange(event.target.value)}
        />
        <button type="button" onClick={onRunCustom} disabled={!customInstruction.trim()}>
          Run
        </button>
      </div>

      {preview ? (
        <div className="refinement-preview" aria-live="polite">
          <div className="refinement-preview-head">
            <div>
              <span className="refinement-preview-kicker">AI draft</span>
              <strong>{preview.label}</strong>
              <p>{preview.summary}</p>
            </div>
            <span className="refinement-preview-scope">{getScopeLabel(preview.scope)}</span>
          </div>

          <div className="refinement-preview-columns">
            <div className="refinement-preview-pane">
              <span>Original</span>
              <pre>{preview.originalText}</pre>
            </div>
            <label className="refinement-preview-pane refinement-preview-pane--editable">
              <span>Suggested draft</span>
              <textarea
                aria-label="AI refinement preview draft"
                value={previewDraft}
                onChange={(event) => onPreviewDraftChange(event.target.value)}
              />
            </label>
          </div>

          <div className="refinement-preview-actions">
            <button type="button" onClick={onApplyReplace}>Replace</button>
            <button type="button" className="ghost-button" onClick={onApplyInsertBelow}>Insert below</button>
            <button type="button" className="ghost-button" onClick={onCancelPreview}>Cancel</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
