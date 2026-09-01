import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { SubnetService } from '@products/00_shared/services/subnet.service';
import { StateService } from '@shared/services/state.service';
import { of } from 'rxjs';

const MAX_SUBNETS = 10;

@Component({
  selector: 'spx-security-group-subnet-form',
  imports: [MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './security-group-subnet-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityGroupSubnetFormComponent implements OnInit {
  private subnetService = inject(SubnetService);
  private stateSvc = inject(StateService);

  az = input.required<string>();
  initSubnetEIds = input<string[]>();

  subnetEIdsChange = output<string[]>();

  availableSubnets = rxResource({
    params: () => this.az(),
    stream: () => {
      const az = this.az();
      if (az && this.stateSvc.organization()?.id && this.stateSvc.project()?.id) {
        return this.subnetService.listByAZ(this.stateSvc.organization()!.id, this.stateSvc.project()!.id, az);
      }
      return of([]);
    },
  });

  selectedSubnetEIds = signal<string[]>([]);

  isMaxReached = computed(() => this.selectedSubnetEIds().length >= MAX_SUBNETS);

  private previousAz: string | null = null;

  constructor() {
    effect(() => {
      const currentAz = this.az();
      if (this.previousAz !== null && currentAz !== this.previousAz) {
        this.selectedSubnetEIds.set([]);
        this.subnetEIdsChange.emit([]);
      }
      this.previousAz = currentAz;
    });
  }

  ngOnInit(): void {
    const init = this.initSubnetEIds();
    if (init) {
      this.selectedSubnetEIds.set([...init]);
    }
  }

  onSelectionChange(selectedEIds: string[]): void {
    const limited = selectedEIds.slice(0, MAX_SUBNETS);
    this.selectedSubnetEIds.set(limited);
    this.subnetEIdsChange.emit(limited);
  }
}
