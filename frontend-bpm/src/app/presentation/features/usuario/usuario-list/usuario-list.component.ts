import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../../../data/services/usuario.service';
import { OrganizacionService } from '../../../../data/services/organizacion.service';
import { DepartamentoService } from '../../../../data/services/departamento.service';
import { RolService } from '../../../../data/services/rol.service';
import { AnaliticaService } from '../../../../data/services/analitica.service';
import { Usuario, UsuarioResponseDTO } from '../../../../data/models/usuario.model';
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
  usuarios: UsuarioResponseDTO[] = [];
  organizaciones: Organizacion[] = [];
  departamentos: Departamento[] = [];
  rolesMap: Map<string, string> = new Map(); // id → nombre
  roles: Rol[] = [];

  selectedOrgId = '';
  selectedDepId = '';

  loading = false;
  showForm = false;

  // Reassignment State
  showReassignModal = false;
  selectedUser: UsuarioResponseDTO | null = null;
  targetDeptId = '';
  reassignMotivo = '';

  private usuarioService = inject(UsuarioService);
  private orgService = inject(OrganizacionService);
  private depService = inject(DepartamentoService);
  private rolService = inject(RolService);
  private analiticaService = inject(AnaliticaService);

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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
      next: ({ orgs, roles }: { orgs: Organizacion[], roles: Rol[] }) => {
        this.organizaciones = orgs;
        this.roles = roles;
        roles.forEach((r: Rol) => {
          if (r.id) this.rolesMap.set(r.id, r.nombre);
        });
        this.cdr.detectChanges();

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
      error: (err: any) => console.error('Error cargando datos iniciales', err)
    });
  }

  onOrganizacionChange() {
    this.selectedDepId = '';
    this.usuarios = [];
    this.departamentos = [];
    
    if (!this.selectedOrgId) return;

    this.depService.listarPorOrganizacion(this.selectedOrgId).subscribe({
      next: (data: Departamento[]) => {
        this.departamentos = data;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error cargando departamentos', err)
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
      next: (data: UsuarioResponseDTO[]) => {
        this.usuarios = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar usuarios', err);
        this.loading = false;
        this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }

  onFormCancel(): void {
    this.showForm = false;
  }

  // --- REASIGNACION ---
  openReassignModal(user: UsuarioResponseDTO): void {
    this.selectedUser = user;
    this.targetDeptId = '';
    this.reassignMotivo = '';
    this.showReassignModal = true;
  }

  closeReassignModal(): void {
    this.showReassignModal = false;
    this.selectedUser = null;
  }

  confirmReassign(): void {
    if (!this.selectedUser || !this.targetDeptId) return;

    this.loading = true;
    this.analiticaService.reassignPersonal({
      idOrigen: this.selectedDepId,
      idDestino: this.targetDeptId,
      userIds: [this.selectedUser.id],
      motivo: this.reassignMotivo
    }).subscribe({
      next: () => {
        alert('✅ Funcionario transferido exitosamente.');
        this.closeReassignModal();
        this.cargarUsuarios(); // Recargar lista
      },
      error: (err) => {
        console.error(err);
        alert('❌ Error al transferir: ' + (err.error?.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }
}
