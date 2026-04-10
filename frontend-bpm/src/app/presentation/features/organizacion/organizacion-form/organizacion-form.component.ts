import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrganizacionService } from '../../../../data/services/organizacion.service';
import { Organizacion } from '../../../../data/models/organizacion.model';

@Component({
  selector: 'app-organizacion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './organizacion-form.component.html',
  styleUrls: ['./organizacion-form.component.css']
})
export class OrganizacionFormComponent implements OnInit {
  orgForm!: FormGroup;
  isSubmitting = false;
  successMessage = '';

  constructor(private fb: FormBuilder, private orgService: OrganizacionService) {}

  ngOnInit(): void {
    this.orgForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      colorPrimario: ['#1e293b'],
      colorSecundario: ['#f8fafc']
    });
  }

  onSubmit() {
    if (this.orgForm.invalid) return;

    this.isSubmitting = true;
    const formValue = this.orgForm.value;
    
    const payload: Organizacion = {
      nombre: formValue.nombre,
      esquemaColores: { 
        primary: formValue.colorPrimario,
        secondary: formValue.colorSecundario
      }
    };

    this.orgService.crear(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = `Tenant '${res.nombre}' agregado de forma segura a la Base de Datos.`;
        this.orgForm.reset({ colorPrimario: '#1e293b', colorSecundario: '#f8fafc' });
      },
      error: (err) => {
        console.error('Error al disparar API en Backend', err);
        this.isSubmitting = false;
      }
    });
  }
}
