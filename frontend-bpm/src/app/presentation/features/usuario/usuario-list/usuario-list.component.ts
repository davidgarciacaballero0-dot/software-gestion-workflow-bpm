import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../../../data/services/usuario.service';
import { OrganizacionService } from '../../../../data/services/organizacion.service';
import { DepartamentoService } from '../../../../data/services/departamento.service';
import { RolService } from '../../../../data/services/rol.service';
import { Usuario } from '../../../../data/models/usuario.model';
import { Organizacion } from '../../../../data/models/organizacion.model';
import { Departamento } from '../../../../data/models/departamento.model';
import { Rol } from '../../../../data/models/rol.model';
import { AuthService } from '../../../../data/services/auth.service';
import { UsuarioFormComponent } from '../usuario-form/usuario-form.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UsuarioFormComponent],
  templateUrl: './usuario-list.component.html',
  styleUrls: ['./usuario-list.component.css']
})
export class UsuarioListComponent implements OnInit {
  usuarios: Usuario[] = [];
  organizaciones: Organizacion[] = [];
  departamentos: Departamento[] = [];
  rolesMap: Map<string, string> = new Map(); // id → nombre

  selectedOrgId = '';
  selectedDepId = '';

  loading = false;
  showForm = false;

  constructor(
    private usuarioService: UsuarioService,
    private orgService: OrganizacionService,
    private depService: DepartamentoService,
    private rolService: RolService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    // Cargar organizaciones y roles en paralelo
    forkJoin({
      orgs: this.orgService.listarTodas(),
      roles: this.rolService.listarRoles()
    }).subscribe({
      next: ({ orgs, roles }) => {
        this.organizaciones = orgs;
        roles.forEach(r => {
          if (r.id) this.rolesMap.set(r.id, r.nombre);
        });

        // Auto-seleccionar organización del usuario actual si existe
        const user = this.authService.currentUser();
        if (user?.idOrganizacion) {
          this.selectedOrgId = user.idOrganizacion;
          this.onOrganizacionChange();
          
          // Auto-seleccionar departamento si el user tiene uno
          if (user?.idDepartamento) {
            this.selectedDepId = user.idDepartamento;
            this.cargarUsuarios();
          }
        }
      },
      error: (err) => console.error('Error cargando datos iniciales', err)
    });
  }

  onOrganizacionChange() {
    this.selectedDepId = '';
    this.usuarios = [];
    this.departamentos = [];
    
    if (!this.selectedOrgId) return;

    this.depService.listarPorOrganizacion(this.selectedOrgId).subscribe({
      next: (data) => {
        this.departamentos = data;
      },
      error: (err) => console.error('Error cargando departamentos', err)
    });
  }

  onDepartamentoChange() {
    this.usuarios = [];
    if (!this.selectedDepId) return;
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    if (!this.selectedDepId) {
      this.usuarios = [];
      return;
    }

    this.loading = true;
    this.usuarioService.listarPorDepartamento(this.selectedDepId).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios', err);
        this.loading = false;
      }
    });
  }

  getNombreRol(idRol: string): string {
    return this.rolesMap.get(idRol) || idRol;
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

  onUsuarioCreated(usuario: any) {
    this.showForm = false;
    // Recargar lista si hay departamento seleccionado
    if (this.selectedDepId) {
      this.cargarUsuarios();
    }
  }

  onFormCancel() {
    this.showForm = false;
  }
}
