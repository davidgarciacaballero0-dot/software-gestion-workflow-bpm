import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="background: red; color: white; padding: 50px; text-align: center; font-size: 30px;">
      EL MOTOR DE ANGULAR HA ARRANCADO CORRECTAMENTE
    </div>
  `
})
export class App {}
