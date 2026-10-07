export default function SystemIcon({ power = false }: { power?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {power
      ? <path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      : <><path d="M3 21V7l9-4 9 4v14M8 21v-6h8v6M7 9h2m6 0h2M7 12h2m6 0h2M2 21h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>}
  </svg>;
}


