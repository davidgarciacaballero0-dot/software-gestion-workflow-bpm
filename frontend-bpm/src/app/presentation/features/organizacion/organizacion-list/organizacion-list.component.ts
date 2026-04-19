import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizacionService } from '../../../../data/services/organizacion.service';
import { Organizacion } from '../../../../data/models/organizacion.model';
import { OrganizacionFormComponent } from '../organizacion-form/organizacion-form.component';

@Component({
  selector: 'app-organizacion-list',
  standalone: true,
  imports: [CommonModule, OrganizacionFormComponent],
  templateUrl: './organizacion-list.component.html',
  styleUrls: ['./organizacion-list.component.css']
})
export class OrganizacionListComponent implements OnInit {
  organizaciones: Organizacion[] = [];
  loading = true;
  showForm = false;

  constructor(private orgService: OrganizacionService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.orgService.listarTodas().subscribe({
      next: (data) => {
        this.organizaciones = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error Carga UI', err);
        this.loading = false;
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

  onOrganizacionCreated(org: Organizacion) {
    this.showForm = false;
    this.cargarDatos();
  }

  onFormCancel() {
    this.showForm = false;
  }
}
