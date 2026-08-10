import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { CustomCalendarComponent } from '@app-components/common/custom-calendar/custom-calendar.component';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BankingActivity } from '@app-shared/models/BankingActivity';
import { EirRejectService } from '../../services/eir-reject.service';
import { EirReject } from '../../models/eirRejects/EirReject';
import { DatePipe } from '@angular/common';
import { FileUpload } from 'primeng/fileupload';
import { JurisdictionService } from '../../../app/shared/jurisdiction/jurisdiction.service';
import { AlertGuardService } from '../../../alerts/services/alert-guard.service';
import { Message } from 'primeng/api';

@Component({
  selector: 'app-flows-reject',
  templateUrl: './flows-reject.component.html',
  styleUrls: ['./flows-reject.component.scss']
})
export class FlowsRejectComponent implements OnInit {
  @ViewChild('fileUpload') fileupload: FileUpload;

  readonly specificTags = ['Accounting', 'SGI SMM'];
  eIRRejects: { [key: string]: EirReject[] } = {};
  rejectsForm: UntypedFormGroup;
  instanceFilter: string[] = [];
  dateEvent: string;
  today: Date = new Date();
  listofBankingActivities: BankingActivity[] = [];
  isInit = true;
  currentLang: string;
  viewModes: any[] = [];
  selectedViewMode: any;
  uploadedFile: any[] = [];
  message: Message[] = [];
  isAllowed: boolean;

  showFilterDrawer = false;
  globalSearchText = '';

  constructor(
    private eirRejectService: EirRejectService,
    private readonly formBuilder: UntypedFormBuilder,
    private translate: TranslateService,
    @Inject('JurisdictionService') private jurisdiction: JurisdictionService,
    private alertGuardService: AlertGuardService
  ) {
    this.translate.setDefaultLang('fr');
  }

  toggleFilterDrawer(): void {
    this.showFilterDrawer = !this.showFilterDrawer;
  }

  selectTab(mode: any): void {
    if (mode) {
      this.selectedViewMode = mode;
      if (this.rejectsForm && this.rejectsForm.get('viewMode')) {
        this.rejectsForm.get('viewMode').setValue(mode);
      }
      if (!this.isInit) {
        this.getEirRejects();
      }
    }
  }

  resetFilters(): void {
    this.instanceFilter = [];
    this.globalSearchText = '';
    if (!this.isInit) {
      this.getEirRejects();
    }
  }

  ngOnInit(): void {
    this.specificTags.forEach(tag => {
      this.eIRRejects[tag] = [];
    });
    this.getCurrentLanguage();
    this.initializeViewModes();
    this.jurisdiction.getUserId().subscribe(userId => {
      this.alertGuardService.resolveWithUser(userId).then(isAllowed => {
        this.isAllowed = isAllowed;
      });
    });
  }

  private initializeViewModes(): void {
    this.viewModes = [
      {
        title: this.translate.instant('dashboardEirReject.onglet1.title'),
        value: this.specificTags[0]
      },
      {
        title: this.translate.instant('dashboardEirReject.onglet2.title'),
        value: this.specificTags[1]
      }
    ];

    this.selectedViewMode = this.viewModes[0];

    this.rejectsForm = this.formBuilder.group({
      accountingDay: CustomCalendarComponent.buildDateForm(this.today),
      viewMode: new UntypedFormControl(this.selectedViewMode)
    });

    this.subscribeToFormChanges();
    this.subscribleToLangChanges();
  }

  private subscribeToFormChanges(): void {
    this.rejectsForm.valueChanges.subscribe(value => {
      this.updateDate(value.accountingDay.dateValue);
      this.updateViewMode(value.viewMode);
      if (!this.isInit) {
        this.getEirRejects();
      }
    });
  }

  private updateViewMode(mode: any): void {
    this.selectedViewMode = mode;
  }

  private getEirRejects(): void {
    this.isInit = false;

    if (!this.instanceFilter || this.instanceFilter.length === 0) {
      this.updateRejects([]);
      return;
    }

    this.eirRejectService
      .getEIRRejects(
        this.dateEvent,
        this.instanceFilter,
        this.currentLang,
        this.selectedViewMode.value
      )
      .then(data => {
        this.updateRejects(data);
      });
  }

  private getAccountingDateoflastEvent(): void {
    this.eirRejectService.getAccountingDateOflastEvent().subscribe(response => {
      this.rejectsForm.get('accountingDay').setValue({ dateValue: new Date(response) });
    });
  }

  updateRejects(data: EirReject[]): void {
    const newData: any = {};
    newData[this.selectedViewMode.value] = data;
    this.eIRRejects = { ...this.eIRRejects, ...newData };
  }

  instanceToParent(instances: any): void {
    this.updateInstances(instances);

    if (this.isInit) {
      this.getAccountingDateoflastEvent();
      this.isInit = false;
      return; // pour ne pas avoir a faire la requete suivante; elle sera executé en revanche pendant le updateDate
    }

    this.getEirRejects();
  }

  updateDate(date: any): void {
    if (date === undefined || date === null) {
      date = this.today;
    }
    this.dateEvent = new DatePipe('en-US').transform(date, 'yyyy-MM-dd');
  }

  updateInstances(instances: any): void {
    this.instanceFilter = instances;
  }

  private getCurrentLanguage(): void {
    this.currentLang = this.translate.currentLang;
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.currentLang = event.lang;
    });
  }

  private subscribleToLangChanges(): void {
    this.translate.onLangChange.subscribe((lang: LangChangeEvent) => {
      this.currentLang = lang.lang;
      // recharger le tableau avec de nouveau event containing un DTO en anglais
      if (!this.isInit) {
        this.getEirRejects();
      }
    });
  }

  uploadFile(event: any): void {
    for (const file of event.files) {
      this.uploadedFile.push(file);
    }
    this.message = [];
    this.eirRejectService.upload(this.uploadedFile[0]).subscribe((res: any) => {
      this.message = [
        {
          detail: res?.message || event?.message,
          severity: 'success',
          life: 4000
        } as Message
      ];
    });
  }

  clearUploadInput(): void {
    this.uploadedFile = [];
    if (this.fileupload) {
      this.fileupload.clear();
    }
  }
}