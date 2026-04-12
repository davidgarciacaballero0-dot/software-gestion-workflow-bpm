import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DepartamentoService } from '../../../../data/services/departamento.service';
import { Departamento } from '../../../../data/models/departamento.model';

@Component({
  selector: 'app-departamento-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './departamento-view.component.html',
  styleUrls: ['./departamento-view.component.css']
})
export class DepartamentoViewComponent implements OnInit {
  // Input que recibe dinámicamente la Organización Padre que se esté viendo
  @Input() idOrganizacion!: string; 
  
  departamentos: Departamento[] = [];
  depForm!: FormGroup;
  isSubmitting = false;
  loading = true;

  constructor(private fb: FormBuilder, private depService: DepartamentoService) {}

  ngOnInit(): void {
    if(!this.idOrganizacion) {
      console.warn('UI Warning: Este sub-componente requiere recibir un idOrganizacion Padre.');
      // Simulando un ID para renderizar la UI sin fallar si se carga aislado
      this.idOrganizacion = 'MOCK_ID_FALLBACK'; 
    }
    
    this.depForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      codigoArea: ['', [Validators.required]],
      idJefe: [''] // CU-17: Opcional inicialmente
    });
    
    this.cargarDatos();
  }

  cargarDatos() {
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

  onSubmit() {
    if (this.depForm.invalid) return;

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
}
