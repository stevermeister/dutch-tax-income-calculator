import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { constants, SalaryPaycheck } from 'dutch-tax-income-calculator';
import { merge, Subject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styles: [`
    .output-results-table {
      width: 600px;
    }
    
    @media (max-width: 600px) {
      :host ::ng-deep .mdc-data-table__cell {
        padding: 0 10px;
      }
    }
    
    @media (max-width: 960px) {
      :host ::ng-deep table {
        table-layout: fixed;
      }
      :host ::ng-deep td.mat-mdc-cell {
        word-break: break-word;
        white-space: normal;
      }
      :host ::ng-deep td.mat-mdc-cell.report-value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .support-message {
        display: none !important;
      }
      .output-results-table {
        width: 100% !important;
      }

      .results-container {
        flex-direction: column;
      }
    }
  `],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-in', style({ opacity: 1 }))
            ])
        ])
    ],
    standalone: false
})
export class AppComponent implements OnInit, AfterViewChecked {
  showDonateButton = false;
  totalCalculations = 0;
  private calculationSubject = new Subject<void>();
  private meaningfulCalculations = 0;
  private readonly CALCULATION_DEBOUNCE_TIME = 2000; // 2 seconds
  private readonly CALCULATIONS_BEFORE_DONATE = 2;
  readonly MINUTES_PER_CALCULATION = 23; // estimated minutes saved per calculation
  title = 'dutch-tax-income-calculator';
  selectedYear = new FormControl(constants.currentYear.toString());
  years = constants.years.reverse().map((year: number) => year.toString());
  hoursAmount = new FormControl(constants.defaultWorkingHours);
  income = new FormControl(60000);
  startFrom = new FormControl<'Year' | 'Month' | 'Week' | 'Day' | 'Hour'> ('Year');
  ruling = new FormControl(false);
  rulingChoice = new FormControl('normal');
  allowance = new FormControl(false);
  older = new FormControl(false);
  bonusEnabled = new FormControl(false);
  bonusGross = new FormControl(0, [Validators.min(0)]);
  paycheck!: any;


  bonusValues: Record<string, number> = {};

  extraOptions: {
    name: string; sign: string; title: string; label: string;
    checked: boolean; bonusOnly?: boolean;
  }[] = [
    {
      name: 'grossYear',
      sign: '',
      title: 'Year Gross Income',
      label: 'Annual Gross Income',
      checked: false,
    },
    {
      name: 'grossMonth',
      sign: '',
      title: 'Month Gross Income',
      label: 'Monthly Gross Income',
      checked: false,
    },
    {
      name: 'grossWeek',
      sign: '',
      title: 'Week Gross Income',
      label: 'Gross Income per week',
      checked: false,
    },
    {
      name: 'grossDay',
      sign: '',
      title: 'Day Gross Income',
      label: 'Gross Income per day',
      checked: false,
    },
    {
      name: 'grossHour',
      sign: '',
      title: 'Hour Gross Income',
      label: 'Gross Income per hour',
      checked: false,
    },
    {
      name: 'grossAllowance',
      sign: '',
      title: 'Year Gross Holiday Allowance',
      label: 'Gross Holiday Allowance per year',
      checked: false,
    },
    {
      name: 'taxFreeYear',
      sign: '-',
      title: 'Tax Free Income',
      label: 'Amount of income that goes tax free',
      checked: false,
    },
    {
      name: 'taxFree',
      sign: '',
      title: 'Ruling Real Percentage',
      label: 'Absolute Percentage calculated from ruling income and non ruling',
      checked: false,
    },
    {
      name: 'taxableYear',
      sign: '',
      title: 'Taxable Income',
      label: 'Taxable Income Amount',
      checked: true,
    },
    {
      name: 'payrollTax',
      sign: '',
      title: 'Payroll Tax',
      label:
        'Payroll tax is tax imposed on employers or employees, and is calculated as a percentage of the salary that employer pay their staff',
      checked: true,
    },
    {
      name: 'socialTax',
      sign: '',
      title: 'Social Security Tax',
      label:
        'Social Security tax is the tax levied on both employers and employees to fund the Social Security program',
      checked: true,
    },
    {
      name: 'generalCredit',
      sign: '+',
      title: 'General Tax Credit',
      label:
        'General tax credit (algemene heffingskorting) that everyone is entitled',
      checked: true,
    },
    {
      name: 'labourCredit',
      sign: '+',
      title: 'Labour Tax Credit',
      label:
        'Labour tax credit (arbeidskorting) that is given to those that are still in the labour force',
      checked: true,
    },
    {
      name: 'incomeTax',
      sign: '-',
      title: 'Total Income Tax',
      label: 'Total Amount of Taxes',
      checked: false,
    },
    {
      name: 'incomeTaxMonth',
      sign: '-',
      title: 'Month Total Income Tax',
      label: 'Total Amount of Taxes per Month',
      checked: false,
    },
    {
      name: 'netAllowance',
      sign: '',
      title: 'Year Net Holiday Allowance',
      label: 'Year Net Holiday Allowance',
      checked: false,
    },
    {
      name: 'netYear',
      sign: '',
      title: 'Year Net Income',
      label: 'Annual Net Income',
      checked: true,
    },
    {
      name: 'netMonth',
      sign: '',
      title: 'Month Net Income',
      label: 'Monthly Net Income',
      checked: true,
    },
    {
      name: 'netWeek',
      sign: '',
      title: 'Week Net Income',
      label: 'Weekly Net Income',
      checked: false,
    },
    {
      name: 'netDay',
      sign: '',
      title: 'Day Net Income',
      label: 'Daily Net Income',
      checked: false,
    },
    {
      name: 'netHour',
      sign: '',
      title: 'Hour Net Income',
      label: 'Hourly Net Income',
      checked: false,
    },
    {
      name: 'grossBonus',
      sign: '',
      title: 'Gross Bonus',
      label: 'Gross one-off bonus payment',
      checked: true,
      bonusOnly: true,
    },
    {
      name: 'bonusTax',
      sign: '-',
      title: 'Tax on Bonus',
      label: 'Marginal tax deducted from bonus',
      checked: false,
      bonusOnly: true,
    },
    {
      name: 'netBonus',
      sign: '',
      title: 'Net Bonus (take-home)',
      label: 'Bonus payment after tax',
      checked: true,
      bonusOnly: true,
    },
    {
      name: 'totalGross',
      sign: '',
      title: 'Total Gross (Salary + Bonus)',
      label: 'Combined annual gross income including bonus',
      checked: false,
      bonusOnly: true,
    },
    {
      name: 'totalNet',
      sign: '',
      title: 'Total Net (Salary + Bonus)',
      label: 'Combined annual net income including bonus',
      checked: true,
      bonusOnly: true,
    },
  ];

  dataSource!: { name: string; value: number }[];
  displayedColumns: string[] = ['name', 'value'];
  
  tooltipCell: string | null = null;
  tooltipPosition: { x: number; y: number } | null = null;
  tooltipValue: string = '';
  
  cellsWithOverflow: Set<string> = new Set();

  screenWidth: number;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cookieService: CookieService
  ) {
    // set screenWidth on page load
    this.screenWidth = window.innerWidth;
    window.onresize = () => {
      // set screenWidth on screen size change
      this.screenWidth = window.innerWidth;
    };
    
    this.route.queryParams.subscribe(queryParams => {
      queryParams['income'] && this.income.setValue(Number(queryParams['income']));
      queryParams['startFrom'] && this.startFrom.setValue(queryParams['startFrom']);
      queryParams['selectedYear'] && this.selectedYear.setValue(queryParams['selectedYear']);
      queryParams['older'] && this.older.setValue(queryParams['older'] === 'true');
      queryParams['allowance'] && this.allowance.setValue(queryParams['allowance'] === 'true');
      queryParams['hoursAmount'] && this.hoursAmount.setValue(queryParams['hoursAmount']);
      queryParams['ruling'] && this.ruling.setValue(queryParams['ruling'] === 'true');
      queryParams['bonusEnabled'] && this.bonusEnabled.setValue(queryParams['bonusEnabled'] === 'true');
      queryParams['bonusGross'] && this.bonusGross.setValue(Number(queryParams['bonusGross']));
    });


    merge(
      this.income.valueChanges,
      this.startFrom.valueChanges,
      this.selectedYear.valueChanges,
      this.older.valueChanges,
      this.allowance.valueChanges,
      this.hoursAmount.valueChanges,
      this.rulingChoice.valueChanges,
      this.ruling.valueChanges,
      this.bonusEnabled.valueChanges,
      this.bonusGross.valueChanges
    ).subscribe((_) => {
      this.updateRouter();
      this.recalculate();
    });

    this.bonusEnabled.valueChanges.subscribe((enabled) => {
      if (enabled && (this.bonusGross.getRawValue() ?? 0) <= 0) {
        this.recalculate();
        const defaultBonus = Math.round(this.paycheck.grossYear * 0.1);
        this.bonusGross.setValue(defaultBonus, { emitEvent: true });
      }
    });
  }

  ngOnInit(): void {
    this.recalculate();

    // Load total calculations from cookie
    const savedCalculations = this.cookieService.get('totalCalculations');
    this.totalCalculations = savedCalculations ? parseInt(savedCalculations, 10) : 0;

    // Setup calculation tracking
    this.calculationSubject.pipe(
      debounceTime(this.CALCULATION_DEBOUNCE_TIME),  // Wait for user to stop making changes
    ).subscribe(() => {
      this.meaningfulCalculations++;
      if (this.meaningfulCalculations >= this.CALCULATIONS_BEFORE_DONATE) {
        this.showDonateButton = true;
        // Increment and save total calculations
        this.totalCalculations++;
        this.cookieService.set('totalCalculations', this.totalCalculations.toString(), 365); // store for 1 year
      }
    });
  }


  ngAfterViewChecked(): void {
    const isMobile = this.screenWidth <= 600;
    const hasData = this.dataSource && this.dataSource.length > 0;
    
    if (!isMobile || !hasData) {
      return;
    }

    requestAnimationFrame(() => {
      this.dataSource.forEach(element => {
        const cellSelector = `td.report-value[data-cell-id="${element.name}"]`;
        const cell = document.querySelector(cellSelector) as HTMLElement;
        
        if (cell) {
          const hasOverflow = cell.scrollWidth > cell.clientWidth;
          if (hasOverflow) {
            this.cellsWithOverflow.add(element.name);
          } else {
            this.cellsWithOverflow.delete(element.name);
          }
        }
      });
    });
  }

  recalculate(): void {
    this.calculationSubject.next();
    const salary = {
      income: this.income.getRawValue() ?? 0,
      allowance: this.allowance.getRawValue() ?? false,
      socialSecurity: true,
      older: this.older.getRawValue() ?? false,
      hours: this.hoursAmount.getRawValue() ?? 0,
    };
    this.paycheck = new SalaryPaycheck(
      salary,
      this.startFrom.getRawValue()!,
      +(this.selectedYear.getRawValue() ?? constants.currentYear),
      {
        checked: this.ruling.getRawValue() ?? false,
        choice: this.rulingChoice.getRawValue() ?? 'normal',
      } as any
    );

    // Bonus calculation: marginal tax approach
    this.bonusValues = {};
    const bonusOn = this.bonusEnabled.getRawValue();
    if (bonusOn) {
      const grossSalaryYear = this.paycheck.grossYear;
      const grossBonus = Math.max(0, this.bonusGross.getRawValue() ?? 0);

      if (grossBonus > 0) {
        const year = +(this.selectedYear.getRawValue() ?? constants.currentYear);
        const rulingOpts = {
          checked: this.ruling.getRawValue() ?? false,
          choice: this.rulingChoice.getRawValue() ?? 'normal',
        } as any;

        const salaryPlusBonusPaycheck = new SalaryPaycheck(
          { ...salary, income: grossSalaryYear + grossBonus },
          'Year', year, rulingOpts
        );

        const salaryOnlyPaycheck = new SalaryPaycheck(
          { ...salary, income: grossSalaryYear },
          'Year', year, rulingOpts
        );

        // incomeTax is negative (it's a deduction), so taxOnBonus will be negative
        const taxOnBonus = salaryPlusBonusPaycheck.incomeTax - salaryOnlyPaycheck.incomeTax;
        const netBonus = grossBonus + taxOnBonus;

        this.bonusValues = {
          grossBonus: Math.round(grossBonus * 100) / 100,
          bonusTax: Math.round(taxOnBonus * 100) / 100,
          netBonus: Math.round(netBonus * 100) / 100,
          totalGross: Math.round((grossSalaryYear + grossBonus) * 100) / 100,
          totalNet: Math.round((this.paycheck.netYear + netBonus) * 100) / 100,
        };
      }
    }

    const salaryDisambiguate = new Set([
      'grossYear', 'grossMonth', 'grossWeek', 'grossDay', 'grossHour',
      'netYear', 'netMonth', 'netWeek', 'netDay', 'netHour',
      'taxableYear', 'incomeTax', 'incomeTaxMonth',
    ]);

    this.dataSource = this.extraOptions
      .filter((option) => {
        if (option.bonusOnly && !bonusOn) return false;
        return option.checked;
      })
      .map((option) => {
        const suffix = bonusOn && salaryDisambiguate.has(option.name) ? ' (salary)' : '';
        return {
          name: option.title + suffix,
          value: option.bonusOnly ? this.bonusValues[option.name] : this.paycheck[option.name],
        };
      })
      .filter((row) => row.value !== undefined);

    this.cellsWithOverflow.clear();
  }


  showTooltip(cellId: string, element: { name: string; value: number }, event: MouseEvent): void {
    const isMobile = this.screenWidth <= 600;
    if (!isMobile) {
      return;
    }

    const cell = event.currentTarget as HTMLElement;
    const hasOverflow = cell.scrollWidth > cell.clientWidth;
    
    if (!hasOverflow) {
      return;
    }

    // Toggle: if tooltip is already showing for this cell, hide it
    if (this.tooltipCell === cellId) {
      this.hideTooltip();
      return;
    }

    // Show tooltip with formatted value
    this.tooltipCell = cellId;
    this.tooltipValue = this.formatValueForTooltip(element);
    
    // Position tooltip above the cell, centered
    const cellRect = cell.getBoundingClientRect();
    this.tooltipPosition = {
      x: cellRect.left + cellRect.width / 2,
      y: cellRect.top - 10
    };
  }

  private formatValueForTooltip(element: { name: string; value: number }): string {
    if (element.name === 'Ruling Real Percentage') {
      return `${element.value} %`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(element.value);
  }


  hideTooltip(): void {
    this.tooltipCell = null;
    this.tooltipPosition = null;
    this.tooltipValue = '';
  }

  updateRouter() {
    const bonusOn = this.bonusEnabled.getRawValue();
    const params: Record<string, any> = {
      income: this.income.getRawValue(),
      startFrom: this.startFrom.getRawValue(),
      selectedYear: this.selectedYear.getRawValue(),
      older: this.older.getRawValue(),
      allowance: this.allowance.getRawValue(),
      socialSecurity: true,
      hoursAmount: this.hoursAmount.getRawValue(),
      ruling: this.ruling.getRawValue(),
      bonusEnabled: bonusOn || null,
      bonusGross: bonusOn ? this.bonusGross.getRawValue() : null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge', // remove to replace all query params by provided
    });
  }
}
