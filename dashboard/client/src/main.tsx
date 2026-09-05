import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The service worker is written in Phase 8. Registering nothing is better than
// registering a cache that serves stale audio, so this is deliberately empty
// until then.
