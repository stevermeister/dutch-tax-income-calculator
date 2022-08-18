import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RulingComponent } from './ruling.component';

describe('RulingComponent', () => {
  let component: RulingComponent;
  let fixture: ComponentFixture<RulingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RulingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RulingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
