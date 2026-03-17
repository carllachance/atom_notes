import { FormEvent, KeyboardEvent, useState } from 'react';

type CaptureBoxProps = {
  isOpen: boolean;
  onCapture: (text: string) => void;
};

export function CaptureBox({ isOpen, onCapture }: CaptureBoxProps) {
  const [text, setText] = useState('');

  const commitCapture = () => {
    if (!text.trim()) return;
    onCapture(text);
    setText('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    commitCapture();
  };

  if (!isOpen) return null;

  return (
    <form className="capture-box" onSubmit={onSubmit}>
      <textarea
        id="quick-capture"
        placeholder="Drop a thought and press Enter..."
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            commitCapture();
          }
        }}
      />
      <button type="submit" className="capture-action">
        Drop into field
      </button>
    </form>
  );
}
