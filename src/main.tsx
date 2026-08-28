import React from 'react';
<<<<<<< HEAD
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/globals.css';

createRoot(document.getElementById('root') as HTMLElement).render(
=======
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
>>>>>>> cd6475a57766841e4910394643593e42a74146ad
  <React.StrictMode>
    <App />
  </React.StrictMode>
);