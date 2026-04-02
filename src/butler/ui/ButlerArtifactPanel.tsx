import { Artifact } from '../../types';

type ButlerArtifactPanelProps = {
  artifacts: Artifact[];
};

export function ButlerArtifactPanel({ artifacts }: ButlerArtifactPanelProps) {
  return (
    <section className="butler-detail__section">
      <div className="butler-detail__section-head">
        <strong>Artifacts</strong>
        <span>{artifacts.length}</span>
      </div>
      {artifacts.length ? artifacts.map((artifact) => (
        <div key={artifact.id} className="butler-artifact">
          <div className="butler-artifact__head">
            <div className="butler-artifact__title-block">
              <strong>{artifact.title}</strong>
              <div className="butler-artifact__badges">
                <span>{artifact.status.replace(/_/g, ' ')}</span>
                {typeof artifact.metadata?.source === 'string' ? <span>{artifact.metadata.source}</span> : null}
              </div>
            </div>
          </div>
          <p>{artifact.changeSummary}</p>
          <pre className="butler-artifact__preview">{artifact.body}</pre>
          <small>{artifact.provenance}</small>
        </div>
      )) : <p className="butler-detail__placeholder">No staged artifacts yet.</p>}
    </section>
  );
}
