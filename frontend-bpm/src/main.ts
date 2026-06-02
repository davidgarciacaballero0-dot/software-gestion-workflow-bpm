(window as any).global = window;

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  
  // Convertir argumentos a texto descriptivo de forma segura (evitando que los objetos Error serialicen como {})
  const msg = args.map(a => {
    if (a instanceof Error) {
      return a.name + ': ' + a.message + '\n' + a.stack;
    }
    if (a && typeof a === 'object') {
      try {
        // Si tiene estructura de error pero no es un Error nativo
        if (a.message || a.stack) {
          return (a.name || 'Error') + ': ' + a.message + (a.stack ? '\n' + a.stack : '');
        }
        return JSON.stringify(a);
      } catch (e) {
        return String(a);
      }
    }
    return String(a);
  }).join(' ');

  // Ignorar errores ruidosos de extensiones de navegador (ej: adblockers, password managers, etc.)
  const isExtensionError = msg.includes('message channel closed') || 
                           msg.includes('extension') || 
                           msg.includes('extensions::') ||
                           msg.includes('chrome-extension://');
                           
  if (isExtensionError) {
    return;
  }

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
