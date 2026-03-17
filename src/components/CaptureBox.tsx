import { useState } from 'react';

type CaptureBoxProps = {
  isOpen: boolean;
  onCapture: (text: string) => void;
};

export function CaptureBox({ isOpen, onCapture }: CaptureBoxProps) {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  return (
    <section className="capture-box">
      <label htmlFor="quick-capture">Capture</label>
      <textarea
        id="quick-capture"
        placeholder="Drop a thought..."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button
        onClick={() => {
          if (!text.trim()) return;
          onCapture(text);
          setText('');
        }}
      >
        Drop into field
      </button>
    </section>
  );
}
