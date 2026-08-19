import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import {
  CreateInstancePublicIp,
  CreateInstancePublicIpDnat,
  PublicIpExposure,
  PublicIpMode,
} from '@products/00_shared/models/compute/instance/instance';
import { ProductEIP, ProductSubnet } from '@products/00_shared/models/product.model';
import { EipService } from '@products/00_shared/services/eip.service';
import { BannerComponent } from '@shared/components/banner/banner.component';
import { BannerLevelEnum } from '@shared/models/enums';
import { StateService } from '@shared/services/state.service';
import { of } from 'rxjs';

/** Why an interface cannot be given a public IP. */
export type PublicIpEligibility = 'ok' | 'no-nat-gateway' | 'ipv6-only';

/** One configured interface, as the network step knows it. */
export interface PublicIpNic {
  order: number;
  subnet: ProductSubnet;
}

@Component({
  selector: 'spx-instance-public-ip',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    RouterLink,
    BannerComponent,
  ],
  templateUrl: './instance-public-ip.component.html',
  styleUrl: './instance-public-ip.component.scss',
})
export class InstancePublicIpComponent {
  private eipSvc = inject(EipService);
  private stateSvc = inject(StateService);
  private fb = inject(FormBuilder);

  protected readonly BannerLevelEnum = BannerLevelEnum;

  az = input.required<string | null>();
  /** The interfaces currently configured, in order. */
  nics = input.required<PublicIpNic[]>();
  /** Suggested name for a new public IP, derived from the instance name. */
  instanceName = input<string>('');

  publicIpChange = output<CreateInstancePublicIp | undefined>();
  validChange = output<boolean>();

  form = this.fb.nonNullable.group({
    mode: this.fb.nonNullable.control<PublicIpMode>('none'),
    networkOrder: this.fb.nonNullable.control<number>(0),
    exposure: this.fb.nonNullable.control<PublicIpExposure>('full'),
    productName: this.fb.nonNullable.control(''),
    eipEId: this.fb.nonNullable.control(''),
    dnat: this.fb.array<FormGroup>([]),
  });

  /** Set once the user edits the name, so we stop syncing it. */
  private nameEdited = signal(false);

  eips = rxResource({
    params: () => this.az(),
    stream: () => {
      const org = this.stateSvc.organization()?.id;
      const project = this.stateSvc.project()?.id;
      if (this.az() && org && project) {
        return this.eipSvc.listByAZ(org, project, this.az()!);
      }
      return of([] as ProductEIP[]);
    },
  });

  /** Why each interface can or cannot be exposed. */
  eligibility = computed<Map<number, PublicIpEligibility>>(() => {
    const map = new Map<number, PublicIpEligibility>();
    for (const nic of this.nics()) {
      if (!nic.subnet.natGateway) {
        map.set(nic.order, 'no-nat-gateway');
      } else if (nic.subnet.subnet?.spec?.protocol === 'IPv6') {
        map.set(nic.order, 'ipv6-only');
      } else {
        map.set(nic.order, 'ok');
      }
    }
    return map;
  });

  eligibleNics = computed(() => this.nics().filter(nic => this.eligibility().get(nic.order) === 'ok'));

  /** The single reason to show when no interface can be exposed. */
  blockedReason = computed<PublicIpEligibility | undefined>(() => {
    const nics = this.nics();
    if (nics.length === 0 || this.eligibleNics().length > 0) {
      return undefined;
    }
    return nics.some(nic => this.eligibility().get(nic.order) === 'no-nat-gateway') ? 'no-nat-gateway' : 'ipv6-only';
  });

  /** The subnet to link to when explaining a missing nat gateway. */
  blockedSubnet = computed(() => this.nics()[0]?.subnet);

  /**
   * Public IPs already created in this AZ that are free to attach: bound to the
   * selected interface's nat gateway, allocated, and not in use.
   */
  attachableEips = computed<ProductEIP[]>(() => {
    const nic = this.eligibleNics().find(n => n.order === this.selectedOrder());
    if (!nic) {
      return [];
    }
    return (this.eips.value() ?? []).filter(
      eip => eip.eip?.spec?.natGwDp === nic.subnet.eid && eip.eip?.status?.ready && !eip.eip?.status?.nat
    );
  });

  selectedOrder = signal(0);

  get dnat(): FormArray<FormGroup> {
    return this.form.controls.dnat;
  }

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this.selectedOrder.set(this.form.controls.networkOrder.value);
      this.applyValidators();
      this.emit();
    });

    // Keep the suggested name in step with the instance name until it is edited.
    effect(() => {
      const suggested = this.instanceName() ? `${this.instanceName()}-ip` : '';
      if (!this.nameEdited() && this.form.controls.productName.value !== suggested) {
        this.form.controls.productName.setValue(suggested, { emitEvent: false });
      }
    });

    // Reset when the chosen interface disappears or nothing can be exposed.
    effect(() => {
      const eligible = this.eligibleNics();
      if (this.form.controls.mode.value === 'none') {
        return;
      }
      if (eligible.length === 0) {
        this.form.controls.mode.setValue('none');
        return;
      }
      if (!eligible.some(nic => nic.order === this.form.controls.networkOrder.value)) {
        this.form.controls.networkOrder.setValue(eligible[0].order);
      }
    });
  }

  onNameInput() {
    this.nameEdited.set(true);
  }

  addDnat() {
    this.dnat.push(
      this.fb.nonNullable.group({
        externalPort: ['', Validators.required],
        internalPort: ['', Validators.required],
        protocol: ['tcp', Validators.required],
      })
    );
  }

  removeDnat(index: number) {
    this.dnat.removeAt(index);
  }

  /** Only the fields the chosen mode and exposure actually use are required. */
  private applyValidators() {
    const { mode, exposure, productName, eipEId } = this.form.controls;

    productName.setValidators(mode.value === 'new' ? [Validators.required, Validators.maxLength(63)] : []);
    eipEId.setValidators(mode.value === 'existing' ? [Validators.required] : []);

    productName.updateValueAndValidity({ emitEvent: false });
    eipEId.updateValueAndValidity({ emitEvent: false });

    if (mode.value !== 'none' && exposure.value === 'ports' && this.dnat.length === 0) {
      this.addDnat();
    }
  }

  private emit() {
    const value = this.form.getRawValue();

    if (value.mode === 'none') {
      this.publicIpChange.emit(undefined);
      this.validChange.emit(true);
      return;
    }

    const publicIp: CreateInstancePublicIp = {
      mode: value.mode,
      networkOrder: value.networkOrder,
      exposure: value.exposure,
    };

    if (value.mode === 'new') {
      publicIp.productName = value.productName;
    } else {
      publicIp.eipEId = value.eipEId;
    }

    if (value.exposure === 'ports') {
      publicIp.dnat = this.dnat.controls.map(group => group.getRawValue() as CreateInstancePublicIpDnat);
    }

    this.publicIpChange.emit(publicIp);
    this.validChange.emit(this.form.valid && (value.exposure !== 'ports' || this.dnat.length > 0));
  }
}
