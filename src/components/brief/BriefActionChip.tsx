import './BriefActionChip.css';

interface BriefActionChipProps {
  label: string;
  onClick: () => void;
}

export function BriefActionChip({ label, onClick }: BriefActionChipProps) {
  return (
    <button className="brief-action-chip" onClick={onClick}>
      {label}
    </button>
  );
}
