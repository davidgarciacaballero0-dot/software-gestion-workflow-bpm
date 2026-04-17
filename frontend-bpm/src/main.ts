(window as any).global = window;

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
  const div = document.createElement('div');
  div.style.cssText = 'background:red; color:white; padding:10px; margin:5px; border-radius:5px; z-index:99999; position:relative; font-family:monospace; white-space:pre-wrap;';
  div.textContent = 'ERROR EN CONSOLA: ' + msg;
  document.body.appendChild(div);
};

window.addEventListener('error', (event) => {
  console.error('GLOBAL ERROR:', event.message || event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('PROMISE REJECTION:', event.reason);
});

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error('BOOTSTRAP CATCH:', err);
  });
