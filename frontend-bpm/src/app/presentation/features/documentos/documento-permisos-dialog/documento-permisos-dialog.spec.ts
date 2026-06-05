import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentoPermisosDialog } from './documento-permisos-dialog';

describe('DocumentoPermisosDialog', () => {
  let component: DocumentoPermisosDialog;
  let fixture: ComponentFixture<DocumentoPermisosDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentoPermisosDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentoPermisosDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
