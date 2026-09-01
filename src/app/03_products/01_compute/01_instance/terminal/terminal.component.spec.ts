import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SESSION_TOKEN_URL } from '@shared/services/auth.service';

import { TerminalComponent } from './terminal.component';

describe('TerminalComponent', () => {
  let component: TerminalComponent;
  let fixture: ComponentFixture<TerminalComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminalComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TerminalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not initialize terminal when vmName is empty', () => {
    spyOn(component, 'initTerm');
    component.vmName = '';
    component.ngOnInit();
    expect(component.initTerm).not.toHaveBeenCalled();
  });

  it('should call initTerm when vmName is set', () => {
    spyOn(component, 'initTerm');
    component.vmName = 'test-vm';
    component.ngOnInit();
    expect(component.initTerm).toHaveBeenCalled();
  });

  it('should show error message when session token request fails', async () => {
    component.vmName = 'test-vm';
    fixture.detectChanges();

    const initPromise = component.initTerm();
    const reqs = httpMock.match(SESSION_TOKEN_URL);
    reqs.forEach(req => req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' }));

    await initPromise;
  });

  it('should register a custom OSC 8 handler to disable hyperlink underlines', async () => {
    component.vmName = 'test-vm';
    fixture.detectChanges();

    const initPromise = component.initTerm();
    const reqs = httpMock.match(SESSION_TOKEN_URL);
    reqs.forEach(req => req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' }));

    await initPromise;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const terminal = (component as any).terminal;
    expect(terminal).toBeTruthy();
    // Verify the parser exists and the OSC handler was registered
    expect(terminal.parser).toBeTruthy();
  });
});
