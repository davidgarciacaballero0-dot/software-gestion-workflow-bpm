import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TramiteService } from '../../../data/services/tramite.service';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { AuthService } from '../../../data/services/auth.service';
import { FileUploaderComponent } from '../../shared/file-uploader/file-uploader.component';
import { switchMap, finalize } from 'rxjs';

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
  errorMessage: string | null = null;

  // Modal de Éxito Premium
  showSuccessModal = false;
  targetNodeName = '';
  targetDeptName = '';

  private userId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tramiteService: TramiteService,
    private politicaService: PoliticaWorkflowService,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private zone: NgZone,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userId = payload.userId || '';
      } catch (e) {}
    }

    const tramiteId = this.route.snapshot.paramMap.get('id');
    if (tramiteId) {
      this.cargarTramite(tramiteId);
    }
  }

  cargarTramite(id: string): void {
    this.loading = true;
    this.errorMessage = null;

    this.tramiteService.obtenerTramite(id).pipe(
      switchMap(tramite => {
        console.log('📦 Trámite cargado:', tramite);
        if (!tramite) {
          throw new Error('No se encontró información del trámite.');
        }
        this.tramite = tramite;

        // AUTO-ASIGNACIÓN (Si no tiene responsable y es un funcionario)
        const user = this.authService.currentUser();
        const isStaff = user?.nombreRol === 'JEFE' || user?.nombreRol === 'ADMIN' || user?.nombreRol === 'FUNCIONARIO';
        
        if (isStaff && (!tramite.funcionarioAsignadoId || tramite.funcionarioAsignadoId === '')) {
          console.log('⚡ Auto-asignando trámite al funcionario actual...');
          return this.tramiteService.asignarFuncionario(tramite.id, this.userId).pipe(
            switchMap(assignedTramite => {
              this.tramite = assignedTramite;
              return this.politicaService.obtenerPorId(assignedTramite.idPolitica);
            })
          );
        }

        if (!tramite.idPolitica) {
          throw new Error('El trámite no tiene una política asociada.');
        }
        return this.politicaService.obtenerPorId(tramite.idPolitica);
      }),
      finalize(() => {
        this.zone.run(() => {
          this.loading = false;
          this.cd.detectChanges();
          console.log('⏳ Carga finalizada (Loading set to false)');
        });
      })
    ).subscribe({
      next: (politica) => {
        this.zone.run(() => {
          console.log('🗺️ Política cargada:', politica);
          this.politica = politica;
          this.procesarPolitica(politica);
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error('❌ Error en el flujo de carga:', err);
          this.errorMessage = 'No se pudo cargar el entorno: ' + (err.message || 'Error de conexión');
          this.cd.detectChanges();
        });
      }
    });
  }

  private procesarPolitica(politica: any): void {
    if (!politica || !politica.nodes) {
      this.errorMessage = 'La política no contiene nodos configurados.';
      return;
    }

    this.nodoActual = politica.nodes.find((n: any) => n.id === this.tramite.nodoActualId);
    
    if (!this.nodoActual) {
      this.errorMessage = `No se encontró el paso actual (${this.tramite.nodoActualId}) en la definición del flujo.`;
      return;
    }

    this.formFields = this.nodoActual.formDefinition || [];
    
    // Inicializar formData: precargar con datos acumulados existentes del trámite
    // para que los gateways puedan evaluar las condiciones correctamente
    this.formData = {};
    this.formFields.forEach((field: any) => {
      // Si el trámite ya tiene datos acumulados para este campo, usarlos como default
      const existingValue = this.tramite.datosAcumuladosFormulario?.[field.fieldId];
      this.formData[field.fieldId] = existingValue !== undefined ? existingValue : '';
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
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `documento_${fileId}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objectUrl);
      },
      error: (err) => {
        this.zone.run(() => {
          this.errorMessage = 'Acceso Denegado: No se pudo descargar el archivo.';
          this.cd.detectChanges();
        });
      }
    });
  }

  completarYEnviar(): void {
    this.submitting = true;
    this.errorMessage = null; // Clear prev error
    
    const request = {
      idTramite: this.tramite.id,
      idUsuarioAccion: this.userId,
      datosFormulario: this.formData
    };

    this.tramiteService.avanzarTramite(request).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.submitting = false;
          
          // REQ: Activar modal de éxito premium
          this.targetNodeName = res.nombreNodoActual || 'Siguiente Paso';
          this.targetDeptName = res.nombreDepartamentoActual || 'Área correspondiente';
          this.showSuccessModal = true;
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.submitting = false;
          this.errorMessage = 'Error al avanzar: ' + (err.error?.message || 'Validación fallida');
          this.cd.detectChanges();
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/app/inbox']);
  }
}
