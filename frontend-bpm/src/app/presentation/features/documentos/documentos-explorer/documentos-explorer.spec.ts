import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentosExplorer } from './documentos-explorer';

describe('DocumentosExplorer', () => {
  let component: DocumentosExplorer;
  let fixture: ComponentFixture<DocumentosExplorer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosExplorer],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosExplorer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
