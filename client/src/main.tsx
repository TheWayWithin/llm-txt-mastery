import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root')!;

// Marketing routes ship prerendered HTML inside #root (scripts/prerender.mjs).
// hydrateRoot reuses that DOM instead of wiping and re-rendering it, which
// createRoot did — the wipe blanked the visible page mid-load and was the
// dominant layout shift on throttled connections (LTM-ISS-13, CLS ~0.5).
// On any hydration mismatch React falls back to a client render, which is
// exactly the old createRoot behaviour. App routes get the empty shell and
// keep the plain client render.
if (container.firstElementChild) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
