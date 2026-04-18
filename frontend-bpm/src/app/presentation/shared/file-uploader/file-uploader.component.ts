import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../data/services/auth.service';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="uploader-box" [class.uploading]="isUploading">
      <div class="uploader-content" *ngIf="!isUploading">
        <label [for]="'fileInput-' + fieldId" class="upload-label">
          <span class="icon">📁</span>
          <span class="text">Seleccionar Archivo</span>
          <small>Máx: 10MB</small>
        </label>
        <input 
          type="file" 
          [id]="'fileInput-' + fieldId" 
          (change)="onFileSelected($event)" 
          style="display: none"
        />
      </div>

      <div class="progress-box" *ngIf="isUploading">
        <div class="spinner"></div>
        <span>Subiendo "{{ fileName }}"...</span>
      </div>

      <div class="success-box" *ngIf="uploadedFileId && !isUploading">
        <span class="success-icon">✅</span>
        <span class="file-name">{{ fileName }}</span>
        <button class="remove-btn" (click)="removeFile()">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .uploader-box {
      border: 2px dashed rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: all 0.3s;
      background: rgba(255, 255, 255, 0.02);
    }
    .uploader-box:hover {
      border-color: var(--primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .upload-label {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .upload-label .icon { font-size: 2rem; }
    .upload-label .text { font-weight: 600; color: #cbd5e1; }
    .upload-label small { color: #64748b; font-size: 0.75rem; }

    .progress-box { display: flex; align-items: center; justify-content: center; gap: 1rem; color: #94a3b8; }
    .spinner { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.1); border-left-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }

    .success-box { display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.1); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); }
    .success-icon { color: #10b981; margin-right: 0.5rem; }
    .file-name { color: #e2e8f0; font-size: 0.85rem; flex: 1; text-align: left; }
    .remove-btn { background: transparent; border: none; color: #475569; cursor: pointer; transition: color 0.2s; }
    .remove-btn:hover { color: #ef4444; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class FileUploaderComponent implements OnInit {
  @Input() fieldId!: string;
  @Input() tramiteId!: string;
  @Input() usuarioId: string = 'USER_MOCK_01';
  @Output() onUploadSuccess = new EventEmitter<string>();

  isUploading = false;
  fileName = '';
  uploadedFileId: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    if (this.usuarioId === 'USER_MOCK_01') {
      const token = this.authService.getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.usuarioId = payload.userId || '';
        } catch (e) {}
      }
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.upload(file);
    }
  }

  private upload(file: File): void {
    this.isUploading = true;
    this.fileName = file.name;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('idTramite', this.tramiteId);
    formData.append('idUsuario', this.usuarioId);

    this.http.post<any>('/api/v1/archivos/upload', formData).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadedFileId = res.id;
        this.onUploadSuccess.emit(res.id);
      },
      error: (err) => {
        console.error(err);
        this.isUploading = false;
        alert('Error al subir el archivo');
      }
    });
  }

  removeFile(): void {
    this.uploadedFileId = null;
    this.fileName = '';
    this.onUploadSuccess.emit('');
  }
}
