import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecurityGroupSubnetFormComponent } from './security-group-subnet-form.component';
import { SubnetService } from '@products/00_shared/services/subnet.service';
import { StateService } from '@shared/services/state.service';
import { of } from 'rxjs';
import { ProductSubnet } from '@products/00_shared/models/product.model';
import { Component, signal } from '@angular/core';

const mockSubnets: ProductSubnet[] = [
  { id: '1', eid: 'subnet-eid-1', productName: 'Subnet 1', gitops: '' },
  { id: '2', eid: 'subnet-eid-2', productName: 'Subnet 2', gitops: '' },
  { id: '3', eid: 'subnet-eid-3', productName: 'Subnet 3', gitops: '' },
];

@Component({
  template: `<spx-security-group-subnet-form
    [az]="az()"
    [initSubnetEIds]="initSubnetEIds()"
    (subnetEIdsChange)="onSubnetChange($event)" />`,
  imports: [SecurityGroupSubnetFormComponent],
})
class TestHostComponent {
  az = signal('az-1');
  initSubnetEIds = signal<string[] | undefined>(undefined);
  selectedSubnetEIds: string[] = [];

  onSubnetChange(eIds: string[]) {
    this.selectedSubnetEIds = eIds;
  }
}

describe('SecurityGroupSubnetFormComponent', () => {
  let component: SecurityGroupSubnetFormComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let subnetServiceSpy: jasmine.SpyObj<SubnetService>;

  beforeEach(async () => {
    subnetServiceSpy = jasmine.createSpyObj('SubnetService', ['listByAZ']);
    subnetServiceSpy.listByAZ.and.returnValue(of(mockSubnets));

    const stateServiceStub = {
      organization: signal({ id: 'org-1' }),
      project: signal({ id: 'proj-1' }),
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: SubnetService, useValue: subnetServiceSpy },
        { provide: StateService, useValue: stateServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();

    component = fixture.debugElement.children[0].componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load subnets on init', () => {
    expect(subnetServiceSpy.listByAZ).toHaveBeenCalledWith('org-1', 'proj-1', 'az-1');
    expect(component.availableSubnets.value()!.length).toBe(3);
  });

  it('should initialize with provided subnet EIds', async () => {
    hostComponent.initSubnetEIds.set(['subnet-eid-1', 'subnet-eid-2']);

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    hostComponent.initSubnetEIds.set(['subnet-eid-1', 'subnet-eid-2']);
    fixture.detectChanges();

    component = fixture.debugElement.children[0].componentInstance;
    expect(component.selectedSubnetEIds()).toEqual(['subnet-eid-1', 'subnet-eid-2']);
  });

  it('should emit selected subnet EIds on selection change', () => {
    component.onSelectionChange(['subnet-eid-1', 'subnet-eid-3']);
    expect(hostComponent.selectedSubnetEIds).toEqual(['subnet-eid-1', 'subnet-eid-3']);
  });

  it('should limit selection to max 10 subnets', () => {
    const elevenEIds = Array.from({ length: 11 }, (_, i) => `subnet-eid-${i}`);
    component.onSelectionChange(elevenEIds);
    expect(component.selectedSubnetEIds().length).toBe(10);
    expect(hostComponent.selectedSubnetEIds.length).toBe(10);
  });

  it('should report isMaxReached when 10 subnets are selected', () => {
    const tenEIds = Array.from({ length: 10 }, (_, i) => `subnet-eid-${i}`);
    component.onSelectionChange(tenEIds);
    expect(component.isMaxReached()).toBeTrue();
  });

  it('should not load subnets when az is empty', async () => {
    subnetServiceSpy.listByAZ.calls.reset();

    hostComponent.az.set('');
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    hostComponent.az.set('');
    fixture.detectChanges();

    // listByAZ should not be called with empty az
    // Note: the component requires az, so it may still be called depending on timing
    // but loadSubnets guards against empty az
    component = fixture.debugElement.children[0].componentInstance;
    expect(component.availableSubnets.value()?.length ?? 0).toBe(0);
  });

  it('should reload subnets and clear selection when az changes', () => {
    // Initial state: az-1 loaded with subnets
    component.onSelectionChange(['subnet-eid-1', 'subnet-eid-2']);
    expect(component.selectedSubnetEIds()).toEqual(['subnet-eid-1', 'subnet-eid-2']);

    const newSubnets: ProductSubnet[] = [
      { id: '4', eid: 'subnet-eid-4', productName: 'Subnet 4', gitops: '' },
    ];
    subnetServiceSpy.listByAZ.and.returnValue(of(newSubnets));
    subnetServiceSpy.listByAZ.calls.reset();

    // Change AZ
    hostComponent.az.set('az-2');
    fixture.detectChanges();

    expect(component.selectedSubnetEIds()).toEqual([]);
    expect(hostComponent.selectedSubnetEIds).toEqual([]);
    expect(subnetServiceSpy.listByAZ).toHaveBeenCalledWith('org-1', 'proj-1', 'az-2');
    expect(component.availableSubnets.value()).toEqual(newSubnets);
  });

  it('should not clear selection when az is set to the same value', () => {
    component.onSelectionChange(['subnet-eid-1']);
    subnetServiceSpy.listByAZ.calls.reset();

    // Set same AZ value
    hostComponent.az.set('az-1');
    fixture.detectChanges();

    expect(component.selectedSubnetEIds()).toEqual(['subnet-eid-1']);
    expect(subnetServiceSpy.listByAZ).not.toHaveBeenCalled();
  });
});
