import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { QueryLayerPrototype } from './prototypes/QueryLayerPrototype';
import './styles/global.css';
import './styles.css';
import './styles/normalization-pass1.css';
import './styles/normalization-pass2.css';
import './styles/normalization-pass3.css';

const pathname = window.location.pathname.replace(/\/$/, '') || '/';
const RootComponent = pathname === '/query-prototype' ? QueryLayerPrototype : App;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
