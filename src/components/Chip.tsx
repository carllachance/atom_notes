import { ReactNode } from 'react';
import './Chip.css';

type ChipVariant = 'neutral' | 'accent' | 'status' | 'warning' | 'danger';

type ChipProps = {
  label: string;
  variant?: ChipVariant;
  active?: boolean;
  onClick: () => void;
  className?: string;
  title?: string;
  leading?: ReactNode;
};

export function Chip({ label, variant = 'neutral', active = false, onClick, className = '', title, leading }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip chip--${variant} ${active ? 'chip--active' : ''} ${className}`.trim()}
      data-chip-variant={variant}
      data-chip-active={active ? 'true' : 'false'}
      onClick={onClick}
      title={title}
    >
      {leading ? <span className="chip__leading" aria-hidden="true">{leading}</span> : null}
      <span className="chip__label">{label}</span>
    </button>
  );
}
