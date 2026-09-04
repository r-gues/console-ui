import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '@env/environment';

import { MainComponent } from './main.component';

describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;

  beforeEach(async () => {
    // Reset announcement for each test
    environment.announcement = undefined;

    await TestBed.configureTestingModule({
      imports: [MainComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    environment.announcement = undefined;
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render logo as a CSS background-image div instead of an img element', () => {
    const logoDiv = fixture.nativeElement.querySelector('.application-logo');
    expect(logoDiv).toBeTruthy();
    expect(logoDiv.getAttribute('role')).toBe('img');
    expect(logoDiv.getAttribute('aria-label')).toBe('SPX Logo');

    const logoImg = fixture.nativeElement.querySelector('.application-logo img');
    expect(logoImg).toBeNull();
  });

  it('should not show the announcement banner when no announcement is configured', () => {
    const banner = fixture.nativeElement.querySelector('.announcement-banner');
    expect(banner).toBeNull();

    const appDiv = fixture.nativeElement.querySelector('.app');
    expect(appDiv.classList).not.toContain('app--with-banner');
  });

  describe('with announcement', () => {
    beforeEach(async () => {
      environment.announcement = { text: 'Maintenance tonight', severity: 'warn' };

      fixture = TestBed.createComponent(MainComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should show the announcement banner', () => {
      const banner = fixture.nativeElement.querySelector('.announcement-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Maintenance tonight');
    });

    it('should add app--with-banner class', () => {
      const appDiv = fixture.nativeElement.querySelector('.app');
      expect(appDiv.classList).toContain('app--with-banner');
    });

    it('should have a close button', () => {
      const closeBtn = fixture.nativeElement.querySelector('.announcement-banner__close');
      expect(closeBtn).toBeTruthy();
    });
  });
});
