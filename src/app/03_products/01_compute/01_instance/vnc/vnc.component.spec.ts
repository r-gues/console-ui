import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VNCComponent } from './vnc.component';

describe('VNCComponent', () => {
  let component: VNCComponent;
  let fixture: ComponentFixture<VNCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VNCComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VNCComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not initialize VNC when vmName is empty', () => {
    spyOn(component, 'initVNC');
    component.vmName = '';
    component.ngOnInit();
    expect(component.initVNC).not.toHaveBeenCalled();
  });

  it('should call initVNC when vmName is set', () => {
    spyOn(component, 'initVNC');
    component.vmName = 'test-vm';
    component.ngOnInit();
    expect(component.initVNC).toHaveBeenCalled();
  });

  it('should wrap uppercase letters with Shift key events during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('Ab'));

    await component.paste();

    // 'A' needs Shift: Shift down, A down, A up, Shift up = 4 calls
    // 'b' no Shift: b down, b up = 2 calls
    expect(mockRfb.sendKey).toHaveBeenCalledTimes(6);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe1, null, true]);  // Shift down
    expect(calls[1]).toEqual([0x41, null, true]);     // A down
    expect(calls[2]).toEqual([0x41, null, false]);    // A up
    expect(calls[3]).toEqual([0xffe1, null, false]);  // Shift up
    expect(calls[4]).toEqual([0x62, null, true]);     // b down
    expect(calls[5]).toEqual([0x62, null, false]);    // b up
  });

  it('should convert newlines to Return keysym during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('a\nb'));

    await component.paste();

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(6);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, null, true); // 'a' down
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, null, false); // 'a' up
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xff0d, null, true); // Return down
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xff0d, null, false); // Return up
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x62, null, true); // 'b' down
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x62, null, false); // 'b' up
  });

  it('should handle Unicode characters with 0x01000000 offset during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('é'));

    await component.paste();

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(2);
    // 'é' = U+00E9, in Latin-1 supplement range (0xa0-0xff), maps directly
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xe9, null, true);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xe9, null, false);
  });

  it('should wrap shifted symbols with Shift key events during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('@#'));

    await component.paste();

    // '@' and '#' are shifted chars: each gets Shift down, key down, key up, Shift up
    expect(mockRfb.sendKey).toHaveBeenCalledTimes(8);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe1, null, true]);  // Shift down
    expect(calls[1]).toEqual([0x40, null, true]);     // @ down
    expect(calls[2]).toEqual([0x40, null, false]);    // @ up
    expect(calls[3]).toEqual([0xffe1, null, false]);  // Shift up
    expect(calls[4]).toEqual([0xffe1, null, true]);   // Shift down
    expect(calls[5]).toEqual([0x23, null, true]);     // # down
    expect(calls[6]).toEqual([0x23, null, false]);    // # up
    expect(calls[7]).toEqual([0xffe1, null, false]);  // Shift up
  });

  it('should not paste when rfb is not initialized', async () => {
    component.rfb = undefined;
    spyOn(navigator.clipboard, 'readText');

    await component.paste();

    expect(navigator.clipboard.readText).not.toHaveBeenCalled();
  });

  it('should disconnect rfb on cleanup', () => {
    const mockRfb = {
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    fixture.destroy();

    expect(mockRfb.disconnect).toHaveBeenCalled();
  });

  it('should lock QEMU extended key events to false on connect to fix AZERTY layout', () => {
    const mockRfb = {
      _qemuExtKeyEventSupported: true,
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.connectedToServer();

    // Property should always read as false via getter
    expect(mockRfb._qemuExtKeyEventSupported).toBeFalse();

    // Verify writes are silently ignored (no-op setter)
    mockRfb._qemuExtKeyEventSupported = true;
    expect(mockRfb._qemuExtKeyEventSupported).toBeFalse();
  });

  it('should toggle virtual keyboard visibility', () => {
    expect(component.showVirtualKeyboard()).toBeFalse();
    component.toggleVirtualKeyboard();
    expect(component.showVirtualKeyboard()).toBeTrue();
    component.toggleVirtualKeyboard();
    expect(component.showVirtualKeyboard()).toBeFalse();
  });

  it('should re-trigger scaleViewport after toggling virtual keyboard', (done) => {
    let scaleValue = true;
    const mockRfb = {
      get scaleViewport() { return scaleValue; },
      set scaleViewport(v: boolean) { scaleValue = v; },
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;
    const spy = spyOnProperty(mockRfb, 'scaleViewport', 'set').and.callThrough();

    component.toggleVirtualKeyboard();

    setTimeout(() => {
      expect(spy).toHaveBeenCalled();
      done();
    });
  });

  it('should send keysym via onVirtualKeyPress without shift', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0x61, needsShift: false, needsCtrl: false, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(2);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, null, true);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, null, false);
  });

  it('should send keysym with shift wrapping via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0x41, needsShift: true, needsCtrl: false, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(4);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe1, 'ShiftLeft', true]);  // Shift down
    expect(calls[1]).toEqual([0x41, null, true]);            // A down
    expect(calls[2]).toEqual([0x41, null, false]);           // A up
    expect(calls[3]).toEqual([0xffe1, 'ShiftLeft', false]); // Shift up
  });

  it('should send keysym with Ctrl wrapping via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0x76, needsShift: false, needsCtrl: true, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(4);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe3, 'ControlLeft', true]);  // Ctrl down
    expect(calls[1]).toEqual([0x76, null, true]);              // v down
    expect(calls[2]).toEqual([0x76, null, false]);             // v up
    expect(calls[3]).toEqual([0xffe3, 'ControlLeft', false]); // Ctrl up
  });

  it('should send keysym with Ctrl+Alt wrapping via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0xffff, code: 'Delete', needsShift: false, needsCtrl: true, needsAlt: true });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(6);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe3, 'ControlLeft', true]);  // Ctrl down
    expect(calls[1]).toEqual([0xffe9, 'AltLeft', true]);      // Alt down
    expect(calls[2]).toEqual([0xffff, 'Delete', true]);       // Del down
    expect(calls[3]).toEqual([0xffff, 'Delete', false]);      // Del up
    expect(calls[4]).toEqual([0xffe9, 'AltLeft', false]);     // Alt up
    expect(calls[5]).toEqual([0xffe3, 'ControlLeft', false]); // Ctrl up
  });

  it('should send function key F1 with scancode via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0xffbe, code: 'F1', needsShift: false, needsCtrl: false, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(2);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xffbe, 'F1', true);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xffbe, 'F1', false);
  });

  it('should not send keysym via onVirtualKeyPress when rfb is undefined', () => {
    component.rfb = undefined;
    // Should not throw
    component.onVirtualKeyPress({ keysym: 0x61, needsShift: false, needsCtrl: false, needsAlt: false });
  });

  it('should send Ctrl+Alt+Del when rfb is connected', () => {
    const mockRfb = {
      sendCtrlAltDel: jasmine.createSpy('sendCtrlAltDel'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.sendCtrlAltDel();

    expect(mockRfb.sendCtrlAltDel).toHaveBeenCalled();
  });
});
