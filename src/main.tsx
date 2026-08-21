import React from 'react';
import ReactDOM from 'react-dom/client';
import '@xterm/xterm/css/xterm.css';
import './styles.css';
import './styles/titlebar.css';
import './styles/home.css';
import './styles/terminal.css';
import './extra.css';
import './styles/dropdown.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
