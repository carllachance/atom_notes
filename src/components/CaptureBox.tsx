import { useState } from 'react';

type CaptureBoxProps = {
  open: boolean;
  onDismiss: () => void;
  onCapture: (title: string, body: string) => void;
};

export function CaptureBox({ open, onDismiss, onCapture }: CaptureBoxProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  if (!open) return null;

  return (
    <div className="capture-overlay">
      <form
        className="capture-box"
        onSubmit={(event) => {
          event.preventDefault();
          onCapture(title, body);
          setTitle('');
          setBody('');
        }}
      >
        <h2>Quick capture</h2>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Note title" autoFocus />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Drop the thought before it disappears..."
        />
        <div className="capture-actions">
          <button type="submit">Save</button>
          <button type="button" onClick={onDismiss}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
