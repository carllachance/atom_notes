type ThinkingGlyphProps = {
  className?: string;
};

export function ThinkingGlyph({ className }: ThinkingGlyphProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        d="M6 3.2c-.9 0-1.7.35-2.3.98A3.3 3.3 0 0 0 2.7 6.5c0 1 .4 1.95 1.08 2.63.38.37.67.82.84 1.32l.12.34h2.2m.3-7.57c.32-.34.78-.52 1.28-.52 1.8 0 3.25 1.48 3.25 3.3 0 .98-.42 1.9-1.15 2.53-.4.35-.7.8-.88 1.31l-.13.38H7.95"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.15"
      />
      <path d="M6.05 10.92h3.9M6.35 12.55h3.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.15" />
      <path d="M5.55 6.1c.23-.62.8-1.04 1.48-1.04M10.02 5.23c.34.2.59.54.67.93" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.05" />
    </svg>
  );
}
