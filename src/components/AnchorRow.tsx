type AnchorRowProps = {
  anchors: string[];
};

export function AnchorRow({ anchors }: AnchorRowProps) {
  return (
    <div className="anchor-row">
      {(anchors.length ? anchors : ['#idea']).map((anchor) => (
        <span key={anchor}>{anchor}</span>
      ))}
    </div>
  );
}
