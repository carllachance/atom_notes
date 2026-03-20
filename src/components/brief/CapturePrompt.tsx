import { useState, useRef } from 'react';
import './CapturePrompt.css';

interface CapturePromptProps {
  placeholder?: string;
  onCapture: (text: string) => void;
}

export function CapturePrompt({ placeholder = 'What are you thinking about?', onCapture }: CapturePromptProps) {
  const [value, setValue] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && value.trim()) {
      onCapture(value.trim());
      setValue('');
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 1200);
    }
  }

  return (
    <div className="capture-prompt">
      <textarea
        ref={textareaRef}
        className="capture-prompt__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
      />
      <div className="capture-prompt__hint mono--sm">⌘↵ to save</div>
      {showConfirmation && (
        <div className="capture-prompt__confirmation">Captured.</div>
      )}
    </div>
  );
}
