import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    environment.announcement = undefined;

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    environment.announcement = undefined;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not show announcement block when no announcement is configured', () => {
    const announcement = fixture.nativeElement.querySelector('.dashboard__announcement');
    expect(announcement).toBeNull();
  });

  describe('with announcement', () => {
    beforeEach(async () => {
      environment.announcement = { text: 'Short text', longText: 'Detailed long text', severity: 'error' };

      fixture = TestBed.createComponent(DashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should show the announcement block', () => {
      const announcement = fixture.nativeElement.querySelector('.dashboard__announcement');
      expect(announcement).toBeTruthy();
    });

    it('should display the longText in the announcement block', () => {
      const content = fixture.nativeElement.querySelector('.dashboard__announcement-content');
      expect(content.textContent).toContain('Detailed long text');
    });

    it('should display the severity label', () => {
      const titleValue = fixture.nativeElement.querySelector('.dashboard__announcement-title-value');
      expect(titleValue.textContent.trim()).toBe('Error');
    });
  });

  describe('with announcement without longText', () => {
    beforeEach(async () => {
      environment.announcement = { text: 'Short text only', severity: 'info' };

      fixture = TestBed.createComponent(DashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should fall back to text when longText is not provided', () => {
      const content = fixture.nativeElement.querySelector('.dashboard__announcement-content');
      expect(content.textContent).toContain('Short text only');
    });

    it('should display Info severity label', () => {
      const titleValue = fixture.nativeElement.querySelector('.dashboard__announcement-title-value');
      expect(titleValue.textContent.trim()).toBe('Info');
    });
  });
});
