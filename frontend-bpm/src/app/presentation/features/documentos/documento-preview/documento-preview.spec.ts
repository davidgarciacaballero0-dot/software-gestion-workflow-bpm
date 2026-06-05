import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentoPreview } from './documento-preview';

describe('DocumentoPreview', () => {
  let component: DocumentoPreview;
  let fixture: ComponentFixture<DocumentoPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentoPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentoPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
