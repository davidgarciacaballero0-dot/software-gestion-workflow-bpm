import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../../../data/services/auditoria.service';
import { Auditoria } from '../../../../data/models/auditoria.model';

@Component({
  selector: 'app-auditoria-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria-list.component.html',
  styleUrls: ['./auditoria-list.component.css']
})
export class AuditoriaListComponent implements OnInit {
  eventos: Auditoria[] = [];
  loading = true;
  filtroUsuarioId = '';

  constructor(private auditoriaService: AuditoriaService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarEventos();
  }

  cargarEventos(): void {
    this.loading = true;
    this.auditoriaService.listarTodos().subscribe({
      next: (data) => {
        this.eventos = data;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error de Recuperación de Bitácora', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  buscarPorUsuario(): void {
    if (!this.filtroUsuarioId || this.filtroUsuarioId.trim() === '') {
      this.cargarEventos();
      return;
    }

    this.loading = true;
    this.auditoriaService.listarPorUsuario(this.filtroUsuarioId.trim()).subscribe({
      next: (data) => {
        this.eventos = data;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error al filtrar bitácora por usuario', err);
        this.eventos = [];
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  limpiarFiltro(): void {
    this.filtroUsuarioId = '';
    this.cargarEventos();
  }
}
