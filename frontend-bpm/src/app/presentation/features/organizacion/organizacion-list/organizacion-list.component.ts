import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizacionService } from '../../../../data/services/organizacion.service';
import { Organizacion } from '../../../../data/models/organizacion.model';

@Component({
  selector: 'app-organizacion-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './organizacion-list.component.html',
  styleUrls: ['./organizacion-list.component.css']
})
export class OrganizacionListComponent implements OnInit {
  organizaciones: Organizacion[] = [];
  loading = true;

  constructor(private orgService: OrganizacionService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
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
}
