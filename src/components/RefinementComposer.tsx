import { REFINEMENT_PRESETS, RefinementPresetId, RefinementScope, RefinementSuggestion } from '../ai/refinement';

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

const quickPresets = REFINEMENT_PRESETS.filter((preset) => ['clarify', 'executive_summary', 'summarize', 'bulletize'].includes(preset.id));
const formatPresets = REFINEMENT_PRESETS.filter((preset) => ['meeting_minutes', 'study_guide', 'legal_brief'].includes(preset.id));

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
        <div>
          <strong>Refine with AI</strong>
          <p>Preview first. Keep the work anchored to {selectionActive ? 'your selection or this note' : 'this note'}.</p>
        </div>
        <span className={`refinement-scope-pill ${selectionActive ? 'active' : ''}`}>
          {selectionActive ? 'Selected text ready' : 'Current note scope'}
        </span>
      </div>

      <div className="refinement-quick-actions" aria-label="Quick AI refinement actions">
        {quickPresets.map((preset) => (
          <button key={preset.id} type="button" className="ghost-button refinement-action-button" onClick={() => onSelectPreset(preset.id)}>
            <strong>{preset.shortLabel}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>

      <div className="refinement-format-strip" aria-label="Format transformations">
        {formatPresets.map((preset) => (
          <button key={preset.id} type="button" className="ghost-button refinement-format-button" onClick={() => onSelectPreset(preset.id)}>
            {preset.shortLabel}
          </button>
        ))}
      </div>

      <label className="refinement-custom-field">
        <span>Custom format instruction</span>
        <div className="refinement-custom-row">
          <input
            aria-label="Custom AI format instruction"
            placeholder="e.g. Rewrite this for an executive audience"
            value={customInstruction}
            onChange={(event) => onCustomInstructionChange(event.target.value)}
          />
          <button type="button" onClick={onRunCustom} disabled={!customInstruction.trim()}>
            Transform
          </button>
        </div>
      </label>

      {preview ? (
        <div className="refinement-preview" aria-live="polite">
          <div className="refinement-preview-head">
            <div>
              <span className="refinement-preview-kicker">AI-suggested</span>
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
            <button type="button" className="ghost-button" onClick={onApplyInsertBelow}>Insert Below</button>
            <button type="button" className="ghost-button" onClick={onCancelPreview}>Cancel</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
