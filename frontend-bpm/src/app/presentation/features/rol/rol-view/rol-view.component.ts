import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolService } from '../../../../data/services/rol.service';
import { Rol } from '../../../../data/models/rol.model';

@Component({
  selector: 'app-rol-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="dashboard-container animate-fade-in" style="font-family: 'Inter', sans-serif; max-width: 900px; margin: 0 auto;">
    <div class="header" style="margin-bottom: 1.5rem;">
      <h1 style="color: var(--primary); font-size: 1.5rem; font-weight: 600; margin: 0;">Gestión de Roles</h1>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0 0 0;">Políticas de acceso y permisos del sistema.</p>
    </div>

    <div style="margin-bottom:1.5rem;">
      <button class="btn-premium btn-premium-primary" (click)="toggleForm()" style="display:flex; align-items:center; gap:0.5rem; width:fit-content;">
        <span class="material-symbols-outlined">{{ showForm ? 'close' : 'add' }}</span>
        {{ showForm ? 'Cerrar Formulario' : 'Nuevo Rol' }}
      </button>
    </div>

    <!-- Formulario de Creación de Rol -->
    <div *ngIf="showForm" class="form-card monolith-surface shadow-ambient animate-fade-in" style="padding:1.5rem; margin-bottom:1.5rem; border-radius:0.75rem;">
      <h3 style="color: var(--primary); font-size:1rem; font-weight:600; margin-bottom:1rem;">Registrar Nuevo Rol</h3>
      
      <div *ngIf="successMessage" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); padding:0.75rem 1rem; border-radius:0.5rem; color:#10b981; font-size:0.85rem; margin-bottom:1rem;">
        {{ successMessage }}
      </div>

      <div style="margin-bottom:1rem;">
        <label style="display:block; font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem;">
          Nombre del Rol <span style="color:#ef4444;">*</span>
        </label>
        <input type="text" [(ngModel)]="nuevoRol.nombre" class="form-control" placeholder="Ej: SUPERVISOR" style="width:100%;">
      </div>

      <div style="margin-bottom:1rem;">
        <label style="display:block; font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem;">
          Permisos (separados por coma)
        </label>
        <input type="text" [(ngModel)]="permisosInput" class="form-control" placeholder="Ej: READ,WRITE,EXECUTE" style="width:100%;">
        <small style="color:var(--text-muted); font-size:0.7rem;">Ingrese los permisos separados por coma. Ej: READ, WRITE, DELETE</small>
      </div>

      <div style="display:flex; gap:0.75rem; margin-top:1rem;">
        <button class="btn btn-secondary" (click)="toggleForm()">Descartar</button>
        <button class="btn btn-primary" [disabled]="!nuevoRol.nombre || isSubmitting" (click)="crearRol()">
          {{ isSubmitting ? 'Creando...' : 'Crear Rol' }}
        </button>
      </div>
    </div>

    <!-- Tabla de Roles -->
    <div class="list-card monolith-surface shadow-ambient" style="padding: 2rem; border-radius:0.75rem;">
      <h3 style="color: var(--primary); padding-bottom: 1.25rem; font-weight: 600; font-size: 1.125rem; border-bottom: 1px solid rgba(200,197,208,0.3);">
        Políticas de Acceso Globales
      </h3>
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
  </div>
  `
})
export class RolViewComponent implements OnInit {
  roles: Rol[] = [];
  showForm = false;
  isSubmitting = false;
  successMessage = '';
  
  nuevoRol: { nombre: string } = { nombre: '' };
  permisosInput = '';

  constructor(private rolService: RolService, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarRoles();
  }

  cargarRoles() {
    this.rolService.listarRoles().subscribe(data => {
      this.roles = data;
      this.cd.detectChanges();
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    this.successMessage = '';
  }

  crearRol() {
    if (!this.nuevoRol.nombre) return;

    this.isSubmitting = true;
    const permisos = this.permisosInput
      .split(',')
      .map(p => p.trim().toUpperCase())
      .filter(p => p.length > 0);

    const payload: Rol = {
      nombre: this.nuevoRol.nombre.toUpperCase(),
      permisos: permisos
    };

    this.rolService.crear(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = `Rol "${res.nombre}" creado exitosamente.`;
        this.nuevoRol.nombre = '';
        this.permisosInput = '';
        this.cargarRoles();
      },
      error: (err) => {
        console.error('Error al crear rol', err);
        this.isSubmitting = false;
      }
    });
  }
}
