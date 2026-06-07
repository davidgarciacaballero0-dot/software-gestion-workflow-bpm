import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentoService, ArchivoAdjunto } from '../../../../data/services/documento.service';
import { AuthService } from '../../../../data/services/auth.service';
import { DocumentoPreviewComponent } from '../documento-preview/documento-preview';

@Component({
  selector: 'app-documentos-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentoPreviewComponent],
  templateUrl: './documentos-explorer.html',
  styleUrls: ['./documentos-explorer.css']
})
export class DocumentosExplorerComponent implements OnInit {
  documentos: ArchivoAdjunto[] = [];
  previewDoc: ArchivoAdjunto | null = null;
  filtroActual: 'TODOS' | 'CLIENTE' | 'POLITICA' = 'TODOS';
  filtroId: string = '';
  loading = false;
  usuarioId = '';

  constructor(
    private documentoService: DocumentoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.usuarioId = user ? user.id : '';
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.loading = true;
    if (this.filtroActual === 'TODOS') {
      this.documentoService.getGlobal(this.usuarioId).subscribe({
        next: (data) => { this.documentos = data; this.loading = false; },
        error: (err) => { console.error(err); this.loading = false; }
      });
    } else if (this.filtroActual === 'CLIENTE' && this.filtroId) {
      this.documentoService.getByCliente(this.filtroId).subscribe({
        next: (data) => { this.documentos = data; this.loading = false; },
        error: (err) => { console.error(err); this.loading = false; }
      });
    } else if (this.filtroActual === 'POLITICA' && this.filtroId) {
      this.documentoService.getByPolitica(this.filtroId).subscribe({
        next: (data) => { this.documentos = data; this.loading = false; },
        error: (err) => { console.error(err); this.loading = false; }
      });
    } else {
      this.loading = false;
    }
  }

  cambiarFiltro(tipo: 'TODOS' | 'CLIENTE' | 'POLITICA') {
    this.filtroActual = tipo;
    if (tipo === 'TODOS') {
      this.filtroId = '';
      this.cargarDocumentos();
    }
  }

  aplicarFiltro() {
    this.cargarDocumentos();
  }

  descargar(doc: ArchivoAdjunto) {
    window.open(`/api/v1/archivos/download/${doc.id}?idUsuario=${this.usuarioId}`, '_blank');
  }

  gestionarPermisos(doc: ArchivoAdjunto) {
    // Open Dialog logic would go here
    console.log('Gestionar permisos para', doc.id);
  }

  verPreview(doc: ArchivoAdjunto) {
    this.previewDoc = doc;
  }
}
