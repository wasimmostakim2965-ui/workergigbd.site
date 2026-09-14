import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// A previously cached prerender can contain another public route (such as
// Privacy Policy). Hide the stale DOM immediately, then reveal only after
// React has mounted the current route. Authentication is not touched.
document.documentElement.classList.add('app-booting');
document.body.style.visibility = 'hidden';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

requestAnimationFrame(() => {
  document.body.style.visibility = '';
  document.documentElement.classList.remove('app-booting');
  document.getElementById('app-loader')?.remove();
});
