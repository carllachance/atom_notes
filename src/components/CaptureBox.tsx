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
        autoFocus
        placeholder="Type a thought. Press Enter to capture."
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            commitCapture();
          }
        }}
      />
    </form>
  );
}
