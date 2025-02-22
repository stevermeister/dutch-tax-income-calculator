import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { constants, SalaryPaycheck } from 'dutch-tax-income-calculator';
import { merge, Subject, timer } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { debounceTime, filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [`
    .output-results-table {
      width: 600px;
    }
    
    @media (max-width: 960px) {
      :host ::ng-deep table {
        table-layout: fixed;
      }
      :host ::ng-deep td.mat-mdc-cell {
        word-break: break-word;
        white-space: normal;
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
  ]
})
export class AppComponent implements OnInit {
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
  paycheck!: any;

  extraOptions = [
    {
      name: 'grossAllowance',
      sign: '',
      title: 'Year Gross Holiday Allowance',
      label: 'Gross Holiday Allowance per year',
      checked: false,
    },
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
      name: 'taxFreeYear',
      sign: '-',
      title: 'Tax Free Income',
      label: 'Ammount of income that goes tax free',
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
  ];

  dataSource!: { name: string; value: number }[];
  displayedColumns: string[] = ['name', 'value'];

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
      //const params = route.snapshot.queryParams;
      queryParams['income'] && this.income.setValue(Number(queryParams['income']));
      queryParams['startFrom'] && this.startFrom.setValue(queryParams['startFrom']);
      queryParams['selectedYear'] && this.selectedYear.setValue(queryParams['selectedYear']);
      queryParams['older'] && this.older.setValue(queryParams['older'] === 'true');
      queryParams['allowance'] && this.allowance.setValue(queryParams['allowance'] === 'true');
      queryParams['hoursAmount'] && this.hoursAmount.setValue(queryParams['hoursAmount']);
      queryParams['ruling'] && this.ruling.setValue(queryParams['ruling'] === 'true');
    });


    merge(
      this.income.valueChanges,
      this.startFrom.valueChanges,
      this.selectedYear.valueChanges,
      this.older.valueChanges,
      this.allowance.valueChanges,
      this.hoursAmount.valueChanges,
      this.rulingChoice.valueChanges,
      this.ruling.valueChanges
    ).subscribe((_) => {
      this.updateRouter();
      this.recalculate();
    });
  }

  ngOnInit(): void {
    // this.updateRouter();
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

  recalculate(): void {
    this.calculationSubject.next();
    const salary = {
      income: this.income.getRawValue(),
      allowance: this.allowance.getRawValue(),
      socialSecurity: true,
      older: this.older.getRawValue(),
      hours: this.hoursAmount.getRawValue(),
    };
    this.paycheck = new SalaryPaycheck(
      salary,
      this.startFrom.getRawValue()!,
      this.selectedYear.getRawValue(),
      {
        checked: this.ruling.getRawValue(),
        choice: this.rulingChoice.getRawValue(),
      }
    );

    this.dataSource = this.extraOptions
      .filter((option) => option.checked)
      .map((option) => ({
        name: option.title,
        value: this.paycheck[option.name],
      }));
  }

  updateRouter() {
    const params = {
      income: this.income.getRawValue(),
      startFrom: this.startFrom.getRawValue(),
      selectedYear: this.selectedYear.getRawValue(),
      older: this.older.getRawValue(),
      allowance: this.allowance.getRawValue(),
      socialSecurity: true,
      hoursAmount: this.hoursAmount.getRawValue(),
      ruling: this.ruling.getRawValue(),
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge', // remove to replace all query params by provided
    });
  }
}
