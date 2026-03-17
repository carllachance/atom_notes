import { useState } from 'react';

type Props = {
  onSubmit: (text: string, expand: boolean) => void;
  onClose: () => void;
};

export const CaptureBox = ({ onSubmit, onClose }: Props) => {
  const [value, setValue] = useState('');

  return (
    <div className="capture-overlay">
      <input
        autoFocus
        className="capture-input"
        placeholder="Capture a thought..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Enter') {
            const expand = event.ctrlKey;
            onSubmit(value.trim(), expand);
          }
        }}
      />
    </div>
  );
};
