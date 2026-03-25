import { Chip } from '../Chip';
import './BriefActionChip.css';

interface BriefActionChipProps {
  label: string;
  onClick: () => void;
}

export function BriefActionChip({ label, onClick }: BriefActionChipProps) {
  return (
    <Chip label={label} onClick={onClick} variant="accent" className="brief-action-chip" />
  );
}
