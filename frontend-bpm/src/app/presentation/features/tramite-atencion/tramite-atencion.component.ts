import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TramiteService } from '../../../data/services/tramite.service';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { FileUploaderComponent } from '../../shared/file-uploader/file-uploader.component';

@Component({
  selector: 'app-tramite-atencion',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploaderComponent],
  templateUrl: './tramite-atencion.component.html',
  styleUrls: ['./tramite-atencion.component.css']
})
export class TramiteAtencionComponent implements OnInit {
  tramite: any = null;
  politica: any = null;
  nodoActual: any = null;
  formFields: any[] = [];
  formData: { [key: string]: any } = {};
  loading = true;
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tramiteService: TramiteService,
    private politicaService: PoliticaWorkflowService
  ) {}

  ngOnInit(): void {
    const tramiteId = this.route.snapshot.paramMap.get('id');
    if (tramiteId) {
      this.cargarTramite(tramiteId);
    }
  }

  cargarTramite(id: string): void {
    this.loading = true;
    this.tramiteService.obtenerTramite(id).subscribe({
      next: (tramite) => {
        this.tramite = tramite;
        this.cargarPolitica(tramite.idPolitica);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  cargarPolitica(idPolitica: string): void {
    this.politicaService.obtenerPorId(idPolitica).subscribe({
      next: (politica) => {
        this.politica = politica;
        this.nodoActual = politica.nodes.find((n: any) => n.id === this.tramite.nodoActualId);
        this.formFields = this.nodoActual?.formDefinition || [];
        
        // Inicializar formData con valores vacíos
        this.formFields.forEach((field: any) => {
          this.formData[field.fieldId] = '';
        });
        
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  getInputType(fieldType: string): string {
    switch (fieldType) {
      case 'TEXT': return 'text';
      case 'NUMBER': return 'number';
      case 'DATE': return 'date';
      case 'BOOLEAN': return 'checkbox';
      case 'FILE': return 'file';
      default: return 'text';
    }
  }

  onFileUpload(fieldId: string, fileId: string): void {
    // Guardamos el ID del archivo en el campo del formulario correspondiente
    this.formData[fieldId] = fileId;
  }

  descargarArchivo(fileId: string): void {
    const url = `/api/v1/archivos/download/${fileId}`;
    window.open(url, '_blank');
  }

  completarYEnviar(): void {
    this.submitting = true;
    
    const request = {
      idTramite: this.tramite.id,
      idUsuarioAccion: 'USER_MOCK_01',
      datosFormulario: this.formData
    };

    this.tramiteService.avanzarTramite(request).subscribe({
      next: (res) => {
        this.submitting = false;
        const msg = res.estadoActual === 'FINALIZADO'
          ? `🎉 Trámite ${res.codigoTramite} FINALIZADO exitosamente.`
          : `✅ Trámite ${res.codigoTramite} avanzó al siguiente paso.`;
        alert(msg);
        this.router.navigate(['/inbox']);
      },
      error: (err) => {
        this.submitting = false;
        alert('Error al avanzar: ' + (err.error?.message || 'Error desconocido'));
      }
    });
  }

  volver(): void {
    this.router.navigate(['/inbox']);
  }
}
