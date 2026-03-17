type AnchorRowProps = {
  activeView: 'canvas' | 'archive';
  onSwitch: (view: 'canvas' | 'archive') => void;
};

export function AnchorRow({ activeView, onSwitch }: AnchorRowProps) {
  return (
    <nav className="anchor-row">
      <button className={activeView === 'canvas' ? 'active' : ''} onClick={() => onSwitch('canvas')}>
        Spatial Canvas
      </button>
      <button className={activeView === 'archive' ? 'active' : ''} onClick={() => onSwitch('archive')}>
        Archive View
      </button>
    </nav>
  );
}
