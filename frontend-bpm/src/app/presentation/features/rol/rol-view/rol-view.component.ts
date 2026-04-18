import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RolService } from '../../../../data/services/rol.service';
import { Rol } from '../../../../data/models/rol.model';

@Component({
  selector: 'app-rol-view',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="list-card monolith-surface shadow-ambient animate-fade-in" style="font-family: 'Inter', sans-serif; padding: 2.5rem; max-width: 800px; margin: 2rem auto;">
    <h3 style="color: var(--primary); padding-bottom: 1.25rem; font-weight: 600; font-size: 1.125rem; border-bottom: 1px solid rgba(200,197,208,0.3);">Políticas de Acceso Globales (Roles)</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 1.5rem;">
      <thead>
        <tr style="background: var(--surface-container-highest); color: var(--primary-container); text-align: left; text-transform: uppercase; font-size: 0.6875rem;">
          <th style="padding: 1rem; font-weight: 600;">Identificador de Seguridad</th>
          <th style="padding: 1rem; font-weight: 600;">Matriz de Permisos Habilitados</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let r of roles" style="border-bottom: 1px solid rgba(200,197,208,0.15);">
          <td style="padding: 1.25rem 1rem; font-weight: 600; color: var(--text-main); font-size: 0.875rem;">{{ r.nombre }}</td>
          <td style="padding: 1.25rem 1rem; font-family: 'SFMono-Regular', Consolas, monospace; color: var(--text-muted); font-size: 0.75rem;">
            <span *ngFor="let p of r.permisos" style="display:inline-block; padding: 0.25rem 0.6rem; background: rgba(196,193,251,0.2); color: var(--primary-container); border:1px solid rgba(196,193,251,0.4); border-radius:0.3rem; margin-right: 0.5rem; margin-bottom: 0.25rem; font-weight: 600;">{{p}}</span>
          </td>
        </tr>
        <tr *ngIf="roles.length === 0">
           <td colspan="2" style="padding: 3rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">No existen directivas activas en el cluster.</td>
        </tr>
      </tbody>
    </table>
  </div>
  `
})
export class RolViewComponent implements OnInit {
  roles: Rol[] = [];
  constructor(private rolService: RolService) {}
  ngOnInit() { this.rolService.listarRoles().subscribe(data => {
      this.roles = data;
  }); }
}
