import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditoriaService } from '../../../../data/services/auditoria.service';
import { Auditoria } from '../../../../data/models/auditoria.model';

@Component({
  selector: 'app-auditoria-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auditoria-list.component.html',
  styleUrls: ['./auditoria-list.component.css']
})
export class AuditoriaListComponent implements OnInit {
  eventos: Auditoria[] = [];
  loading = true;

  constructor(private auditoriaService: AuditoriaService) {}

  ngOnInit(): void {
    this.auditoriaService.listarTodos().subscribe({
      next: (data) => {
        this.eventos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error de Recuperación de Bitácora', err);
        this.loading = false;
      }
    });
  }
}
