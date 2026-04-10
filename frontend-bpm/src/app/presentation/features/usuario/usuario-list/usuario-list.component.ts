import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../../../data/services/usuario.service';
import { Usuario } from '../../../../data/models/usuario.model';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuario-list.component.html',
  styleUrls: ['./usuario-list.component.css']
})
export class UsuarioListComponent implements OnInit {
  // El Directorio se carga dinámicamente cuando el Gerente selecciona un Departamento
  @Input() idDepartamento!: string;
  
  usuarios: Usuario[] = [];
  loading = false;

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    if (this.idDepartamento) {
      this.cargarUsuarios();
    } else {
      console.warn('UI Alert: Esperando asignación de Segmento Departamental para cargar personal.');
      this.idDepartamento = 'MOCK_ID_FALLBACK';
      this.cargarUsuarios();
    }
  }

  cargarUsuarios() {
    this.loading = true;
    this.usuarioService.listarPorDepartamento(this.idDepartamento).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Fallo al rastrear asignaciones de red', err);
        this.loading = false;
      }
    });
  }
}
