import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { DepartamentoService } from '../../../../data/services/departamento.service';
import { OrganizacionService } from '../../../../data/services/organizacion.service';
import { Departamento } from '../../../../data/models/departamento.model';
import { Organizacion } from '../../../../data/models/organizacion.model';
import { AuthService } from '../../../../data/services/auth.service';

@Component({
  selector: 'app-departamento-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './departamento-view.component.html',
  styleUrls: ['./departamento-view.component.css']
})
export class DepartamentoViewComponent implements OnInit {
  @Input() idOrganizacion!: string; 
  
  departamentos: Departamento[] = [];
  organizaciones: Organizacion[] = [];
  depForm!: FormGroup;
  isSubmitting = false;
  loading = false;
  needsOrgSelection = false;

  constructor(
    private fb: FormBuilder, 
    private depService: DepartamentoService, 
    private orgService: OrganizacionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.idOrganizacion) {
      const user = this.authService.currentUser();
      this.idOrganizacion = user?.idOrganizacion || '';
    }
    
    this.depForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      codigoArea: ['', [Validators.required]],
      idJefe: [''] // CU-17: Opcional inicialmente
    });

    if (this.idOrganizacion && this.idOrganizacion.trim() !== '') {
      this.cargarDatos();
    } else {
      // El admin no tiene organización asignada directamente, mostrar selector
      this.needsOrgSelection = true;
      this.cargarOrganizaciones();
    }
  }

  cargarOrganizaciones() {
    this.orgService.listarTodas().subscribe({
      next: (data) => {
        this.organizaciones = data;
      },
      error: (err) => {
        console.error('Error al cargar organizaciones', err);
      }
    });
  }

  onOrganizacionSelected(idOrg: string) {
    if (!idOrg || idOrg.trim() === '') return;
    this.idOrganizacion = idOrg;
    this.needsOrgSelection = false;
    this.cargarDatos();
  }

  cargarDatos() {
    if (!this.idOrganizacion || this.idOrganizacion.trim() === '') {
      this.departamentos = [];
      this.loading = false;
      return;
    }
    this.loading = true;
    this.depService.listarPorOrganizacion(this.idOrganizacion).subscribe({
      next: (data) => {
        this.departamentos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('API Error (Departamento Fetching)', err);
        this.loading = false;
      }
    });
  }

  cambiarOrganizacion() {
    this.needsOrgSelection = true;
    this.departamentos = [];
    this.idOrganizacion = '';
    if (this.organizaciones.length === 0) {
      this.cargarOrganizaciones();
    }
  }

  onSubmit() {
    if (this.depForm.invalid || !this.idOrganizacion) return;

    this.isSubmitting = true;
    const formValue = this.depForm.value;
    
    const payload: Departamento = {
      idOrganizacion: this.idOrganizacion,
      nombre: formValue.nombre,
      codigoArea: formValue.codigoArea,
      idJefe: formValue.idJefe ? formValue.idJefe : undefined
    };

    this.depService.crear(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.depForm.reset();
        this.cargarDatos(); // Sincronización instantánea de Grilla
      },
      error: (err) => {
        console.error('API Error (Departamento Creation)', err);
        this.isSubmitting = false;
      }
    });
  }

  getNombreOrganizacion(): string {
    const org = this.organizaciones.find(o => o.id === this.idOrganizacion);
    return org ? org.nombre : this.idOrganizacion;
  }
}
