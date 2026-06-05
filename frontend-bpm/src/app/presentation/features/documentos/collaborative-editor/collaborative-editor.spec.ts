import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollaborativeEditor } from './collaborative-editor';

describe('CollaborativeEditor', () => {
  let component: CollaborativeEditor;
  let fixture: ComponentFixture<CollaborativeEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollaborativeEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(CollaborativeEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
