import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioService } from '../../../../data/services/usuario.service';
import { OrganizacionService } from '../../../../data/services/organizacion.service';
import { DepartamentoService } from '../../../../data/services/departamento.service';
import { RolService } from '../../../../data/services/rol.service';

import { Organizacion } from '../../../../data/models/organizacion.model';
import { Departamento } from '../../../../data/models/departamento.model';
import { Rol } from '../../../../data/models/rol.model';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuario-form.component.html',
  styleUrls: ['./usuario-form.component.css']
})
export class UsuarioFormComponent implements OnInit {
  @Output() onCreated = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();

  userForm!: FormGroup;
  
  // Repositorios en Memoria para Dropdowns
  organizaciones: Organizacion[] = [];
  departamentos: Departamento[] = [];
  roles: Rol[] = [];
  
  isSubmitting = false;
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private orgService: OrganizacionService,
    private depService: DepartamentoService,
    private rolService: RolService
  ) {}

  ngOnInit(): void {
    // Configuración Reactiva de Seguridad
    this.userForm = this.fb.group({
      idOrganizacion: ['', Validators.required],
      idDepartamento: [{value: '', disabled: true}, Validators.required], // Inicia bloqueado (CASCADA)
      idRol: ['', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      ci: ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.maxLength(10)]],
      celular: ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.maxLength(10)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.cargarDatosEstaticos();
    this.observarCambiosOrganizacion();
  }

  cargarDatosEstaticos() {
    this.orgService.listarTodas().subscribe(data => this.organizaciones = data);
    this.rolService.listarRoles().subscribe(data => this.roles = data);
  }

  // ALGORITMO CASCADA: Evita Violaciones Cross-Tenant de Front a Back
  observarCambiosOrganizacion() {
    this.userForm.get('idOrganizacion')?.valueChanges.subscribe(idOrg => {
      // 1. Limpiar rastro anterior
      this.userForm.get('idDepartamento')?.reset();
      this.userForm.get('idDepartamento')?.disable();
      
      // 2. Fetch de datos en demanda
      if(idOrg) {
        this.depService.listarPorOrganizacion(idOrg).subscribe(data => {
          this.departamentos = data;
          this.userForm.get('idDepartamento')?.enable();
        });
      }
    });
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    this.isSubmitting = true;
    // getRawValue se necesita porque idDepartamento puede estar "disabled" temporalmente
    this.usuarioService.registrar(this.userForm.getRawValue()).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = `Credenciales del funcionario '${res.nombre}' vinculadas al sistema con éxito.`;
        this.userForm.reset();
        this.onCreated.emit(res);
      },
      error: (err) => {
        console.error('Brecha u Operacion abortada por Backend', err);
        this.isSubmitting = false;
      }
    });
  }

  cancelar() {
    this.onCancel.emit();
  }
}
