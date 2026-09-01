import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CONTROLLER_PATH, WS_PROTOCOL, environment } from '@env/environment';
import { SESSION_TOKEN_URL } from '@shared/services/auth.service';
import { Session } from '@shared/models/data/user';
import { AttachAddon } from '@xterm/addon-attach';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'spx-terminal',
  imports: [],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
})
export class TerminalComponent implements OnInit {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private attachAddon?: AttachAddon;
  private webSocket?: WebSocket;
  private resizeListener?: () => void;

  terminalContainer = viewChild<ElementRef<HTMLElement>>('terminalContainer');

  orgaId: string;
  projectId: string;
  vmName: string;
  codeAz: string;

  constructor() {
    const route = inject(ActivatedRoute);

    this.orgaId = route.snapshot.paramMap.get('orgId') || '';
    this.projectId = route.snapshot.paramMap.get('projectId') || '';
    this.codeAz = route.snapshot.paramMap.get('az') || '';
    this.vmName = route.snapshot.paramMap.get('productId') || '';

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  ngOnInit() {
    if (this.vmName) {
      this.initTerm();
    } else {
      console.error('Failed to initialize terminal: missing VM name');
    }
  }

  async initTerm() {
    const container = this.terminalContainer()?.nativeElement;
    if (!container) {
      console.error('Terminal container element not found');
      return;
    }

    this.terminal = new Terminal();
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(container);
    this.fitAddon.fit();

    // Disable OSC 8 hyperlink rendering to prevent dashed underlines
    // that break the display (e.g. with `systemctl status` output)
    this.terminal.parser.registerOscHandler(8, () => true);

    let res: Session;
    try {
      res = await firstValueFrom(this.http.get<Session>(SESSION_TOKEN_URL, { withCredentials: true }));
    } catch (err) {
      console.error('Failed to retrieve session token', err);
      this.terminal.writeln('Error: Unable to authenticate. Please refresh the page.');
      return;
    }

    const accessToken = res.session;
    const wsUrl =
      `${WS_PROTOCOL}${environment.apiUrl}/${this.orgaId}${CONTROLLER_PATH}/${this.codeAz}/${this.projectId}/instance/${this.vmName}/serial?bearer=` +
      accessToken;

    this.webSocket = new WebSocket(wsUrl);

    const sendSize = () => {
      if (this.webSocket?.readyState === WebSocket.OPEN && this.terminal) {
        const windowSize = { high: this.terminal.rows, width: this.terminal.cols };
        const blob = new Blob([JSON.stringify(windowSize)], {
          type: 'application/json',
        });
        this.webSocket.send(blob);
      }
    };

    this.webSocket.onopen = () => {
      sendSize();

      this.attachAddon = new AttachAddon(this.webSocket!);
      this.terminal!.loadAddon(this.attachAddon);
    };

    this.webSocket.onerror = event => {
      console.error('WebSocket error:', event);
      this.terminal?.writeln('\r\nConnection error. Please refresh the page.');
    };

    this.webSocket.onclose = event => {
      if (!event.wasClean) {
        console.error('WebSocket closed unexpectedly:', event.code, event.reason);
        this.terminal?.writeln('\r\nConnection lost. Please refresh the page.');
      }
    };

    this.resizeListener = () => {
      this.fitAddon?.fit();
      sendSize();
    };
    window.addEventListener('resize', this.resizeListener);
  }

  private cleanup() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }

    this.attachAddon?.dispose();
    this.attachAddon = undefined;

    if (this.webSocket) {
      if (this.webSocket.readyState === WebSocket.OPEN || this.webSocket.readyState === WebSocket.CONNECTING) {
        this.webSocket.close();
      }
      this.webSocket = undefined;
    }

    this.fitAddon?.dispose();
    this.fitAddon = undefined;

    this.terminal?.dispose();
    this.terminal = undefined;
  }
}
