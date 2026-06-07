import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../../../data/services/auth.service';

@Component({
  selector: 'app-documento-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documento-preview.html',
  styleUrl: './documento-preview.css',
})
export class DocumentoPreviewComponent implements OnInit, OnChanges {
  @Input() archivoId: string = '';
  @Input() nombreOriginal: string = '';
  @Input() contentType: string = '';
  @Output() close = new EventEmitter<void>();

  safeUrl: SafeResourceUrl | null = null;
  userId: string = '';
  zoomLevel: number = 1.0;
  rotationAngle: number = 0;

  constructor(
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.userId = user ? user.id : '';
    this.updatePreviewUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['archivoId'] || changes['contentType']) {
      this.updatePreviewUrl();
    }
  }

  private updatePreviewUrl(): void {
    if (this.archivoId && this.userId) {
      const rawUrl = `/api/v1/archivos/preview/${this.archivoId}?idUsuario=${this.userId}`;
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
      // Reset controls
      this.zoomLevel = 1.0;
      this.rotationAngle = 0;
    } else {
      this.safeUrl = null;
    }
  }

  isImage(): boolean {
    return this.contentType ? this.contentType.startsWith('image/') : false;
  }

  isPdf(): boolean {
    return this.contentType ? this.contentType === 'application/pdf' : false;
  }

  isVideo(): boolean {
    return this.contentType ? this.contentType.startsWith('video/') : false;
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.2, 3.0);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.2, 0.4);
  }

  rotateRight(): void {
    this.rotationAngle = (this.rotationAngle + 90) % 360;
  }

  resetControls(): void {
    this.zoomLevel = 1.0;
    this.rotationAngle = 0;
  }

  onClose(): void {
    this.close.emit();
  }
}
