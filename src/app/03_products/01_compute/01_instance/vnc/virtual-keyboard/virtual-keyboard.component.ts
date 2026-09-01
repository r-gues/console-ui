import { Component, output, signal } from '@angular/core';

interface KeyDef {
  label: string;
  shiftLabel?: string;
  keysym: number;
  shiftKeysym?: number;
  code?: string; // DOM KeyboardEvent.code for scancode-based keys
  width?: number; // relative width multiplier (default 1)
}

@Component({
  selector: 'spx-virtual-keyboard',
  imports: [],
  templateUrl: './virtual-keyboard.component.html',
  styleUrl: './virtual-keyboard.component.scss',
})
export class VirtualKeyboardComponent {
  keyPress = output<{ keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }>();

  shiftActive = signal(false);
  capsLock = signal(false);
  ctrlActive = signal(false);
  altActive = signal(false);

  private static readonly XK_CTRL_L = 0xffe3;
  private static readonly XK_ALT_L = 0xffe9;
  private static readonly XK_ALT_R = 0xffea;

  readonly functionRow: KeyDef[] = [
    { label: 'Esc', keysym: 0xff1b, code: 'Escape', width: 1.5 },
    { label: 'F1', keysym: 0xffbe, code: 'F1' },
    { label: 'F2', keysym: 0xffbf, code: 'F2' },
    { label: 'F3', keysym: 0xffc0, code: 'F3' },
    { label: 'F4', keysym: 0xffc1, code: 'F4' },
    { label: 'F5', keysym: 0xffc2, code: 'F5' },
    { label: 'F6', keysym: 0xffc3, code: 'F6' },
    { label: 'F7', keysym: 0xffc4, code: 'F7' },
    { label: 'F8', keysym: 0xffc5, code: 'F8' },
    { label: 'F9', keysym: 0xffc6, code: 'F9' },
    { label: 'F10', keysym: 0xffc7, code: 'F10' },
    { label: 'F11', keysym: 0xffc8, code: 'F11' },
    { label: 'F12', keysym: 0xffc9, code: 'F12' },
  ];

  readonly rows: KeyDef[][] = [
    // Row 1: number row
    [
      { label: '`', shiftLabel: '~', keysym: 0x60, shiftKeysym: 0x7e },
      { label: '1', shiftLabel: '!', keysym: 0x31, shiftKeysym: 0x21 },
      { label: '2', shiftLabel: '@', keysym: 0x32, shiftKeysym: 0x40 },
      { label: '3', shiftLabel: '#', keysym: 0x33, shiftKeysym: 0x23 },
      { label: '4', shiftLabel: '$', keysym: 0x34, shiftKeysym: 0x24 },
      { label: '5', shiftLabel: '%', keysym: 0x35, shiftKeysym: 0x25 },
      { label: '6', shiftLabel: '^', keysym: 0x36, shiftKeysym: 0x5e },
      { label: '7', shiftLabel: '&', keysym: 0x37, shiftKeysym: 0x26 },
      { label: '8', shiftLabel: '*', keysym: 0x38, shiftKeysym: 0x2a },
      { label: '9', shiftLabel: '(', keysym: 0x39, shiftKeysym: 0x28 },
      { label: '0', shiftLabel: ')', keysym: 0x30, shiftKeysym: 0x29 },
      { label: '-', shiftLabel: '_', keysym: 0x2d, shiftKeysym: 0x5f },
      { label: '=', shiftLabel: '+', keysym: 0x3d, shiftKeysym: 0x2b },
      { label: 'Backspace', keysym: 0xff08, code: 'Backspace', width: 2 },
    ],
    // Row 2: QWERTY row
    [
      { label: 'Tab', keysym: 0xff09, code: 'Tab', width: 1.5 },
      { label: 'q', keysym: 0x71 },
      { label: 'w', keysym: 0x77 },
      { label: 'e', keysym: 0x65 },
      { label: 'r', keysym: 0x72 },
      { label: 't', keysym: 0x74 },
      { label: 'y', keysym: 0x79 },
      { label: 'u', keysym: 0x75 },
      { label: 'i', keysym: 0x69 },
      { label: 'o', keysym: 0x6f },
      { label: 'p', keysym: 0x70 },
      { label: '[', shiftLabel: '{', keysym: 0x5b, shiftKeysym: 0x7b },
      { label: ']', shiftLabel: '}', keysym: 0x5d, shiftKeysym: 0x7d },
      { label: '\\', shiftLabel: '|', keysym: 0x5c, shiftKeysym: 0x7c },
    ],
    // Row 3: home row
    [
      { label: 'Caps', keysym: 0xffe5, width: 1.8 },
      { label: 'a', keysym: 0x61 },
      { label: 's', keysym: 0x73 },
      { label: 'd', keysym: 0x64 },
      { label: 'f', keysym: 0x66 },
      { label: 'g', keysym: 0x67 },
      { label: 'h', keysym: 0x68 },
      { label: 'j', keysym: 0x6a },
      { label: 'k', keysym: 0x6b },
      { label: 'l', keysym: 0x6c },
      { label: ';', shiftLabel: ':', keysym: 0x3b, shiftKeysym: 0x3a },
      { label: "'", shiftLabel: '"', keysym: 0x27, shiftKeysym: 0x22 },
      { label: 'Enter', keysym: 0xff0d, code: 'Enter', width: 2.2 },
    ],
    // Row 4: shift row
    [
      { label: 'Shift', keysym: 0xffe1, width: 2.5 },
      { label: 'z', keysym: 0x7a },
      { label: 'x', keysym: 0x78 },
      { label: 'c', keysym: 0x63 },
      { label: 'v', keysym: 0x76 },
      { label: 'b', keysym: 0x62 },
      { label: 'n', keysym: 0x6e },
      { label: 'm', keysym: 0x6d },
      { label: ',', shiftLabel: '<', keysym: 0x2c, shiftKeysym: 0x3c },
      { label: '.', shiftLabel: '>', keysym: 0x2e, shiftKeysym: 0x3e },
      { label: '/', shiftLabel: '?', keysym: 0x2f, shiftKeysym: 0x3f },
      { label: 'Shift', keysym: 0xffe1, width: 2.5 },
    ],
    // Row 5: bottom row
    [
      { label: 'Ctrl', keysym: 0xffe3, width: 1.5 },
      { label: 'Alt', keysym: 0xffe9, width: 1.5 },
      { label: 'Space', keysym: 0x20, width: 5 },
      { label: 'Win', keysym: 0xffeb, code: 'MetaLeft', width: 1.5 },
      { label: 'Alt', keysym: 0xffea, width: 1.5 },
    ],
  ];

  readonly navKeys: KeyDef[] = [
    { label: 'Ins', keysym: 0xff63, code: 'Insert' },
    { label: 'PgUp', keysym: 0xff55, code: 'PageUp' },
    { label: 'Del', keysym: 0xffff, code: 'Delete' },
    { label: 'PgDn', keysym: 0xff56, code: 'PageDown' },
  ];

  readonly arrowKeys = {
    up: { label: '↑', keysym: 0xff52, code: 'ArrowUp' } as KeyDef,
    left: { label: '←', keysym: 0xff51, code: 'ArrowLeft' } as KeyDef,
    down: { label: '↓', keysym: 0xff54, code: 'ArrowDown' } as KeyDef,
    right: { label: '→', keysym: 0xff53, code: 'ArrowRight' } as KeyDef,
  };

  private static readonly LETTER_KEYSYMS = new Set(Array.from({ length: 26 }, (_, i) => 0x61 + i));

  isShifted(): boolean {
    return this.shiftActive() !== this.capsLock(); // XOR
  }

  getKeyLabel(key: KeyDef): string {
    if (this.isShifted()) {
      if (key.shiftLabel) return key.shiftLabel;
      if (VirtualKeyboardComponent.LETTER_KEYSYMS.has(key.keysym)) {
        return key.label.toUpperCase();
      }
    }
    return key.label;
  }

  onKeyClick(key: KeyDef) {
    // Handle modifier keys
    if (key.keysym === 0xffe1) {
      this.shiftActive.update(v => !v);
      return;
    }
    if (key.keysym === 0xffe5) {
      this.capsLock.update(v => !v);
      return;
    }
    if (key.keysym === VirtualKeyboardComponent.XK_CTRL_L) {
      this.ctrlActive.update(v => !v);
      return;
    }
    if (key.keysym === VirtualKeyboardComponent.XK_ALT_L || key.keysym === VirtualKeyboardComponent.XK_ALT_R) {
      this.altActive.update(v => !v);
      return;
    }

    const shifted = this.isShifted();
    const needsCtrl = this.ctrlActive();
    const needsAlt = this.altActive();

    if (shifted && key.shiftKeysym) {
      this.keyPress.emit({ keysym: key.shiftKeysym, code: key.code, needsShift: true, needsCtrl, needsAlt });
    } else if (shifted && VirtualKeyboardComponent.LETTER_KEYSYMS.has(key.keysym)) {
      // Uppercase letter: keysym is lowercase + 0x20 offset removed
      this.keyPress.emit({ keysym: key.keysym - 0x20, code: key.code, needsShift: true, needsCtrl, needsAlt });
    } else {
      this.keyPress.emit({ keysym: key.keysym, code: key.code, needsShift: false, needsCtrl, needsAlt });
    }

    // Auto-release modifiers after a key press (not caps lock)
    if (this.shiftActive()) {
      this.shiftActive.set(false);
    }
    if (this.ctrlActive()) {
      this.ctrlActive.set(false);
    }
    if (this.altActive()) {
      this.altActive.set(false);
    }
  }

  isModifierActive(key: KeyDef): boolean {
    if (key.keysym === 0xffe1) return this.shiftActive();
    if (key.keysym === 0xffe5) return this.capsLock();
    if (key.keysym === VirtualKeyboardComponent.XK_CTRL_L) return this.ctrlActive();
    if (key.keysym === VirtualKeyboardComponent.XK_ALT_L || key.keysym === VirtualKeyboardComponent.XK_ALT_R)
      return this.altActive();
    return false;
  }
}
