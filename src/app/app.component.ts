import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { constants, SalaryPaycheck } from 'dutch-tax-income-calculator';
import { merge } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
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

  constructor(private router: Router, private route: ActivatedRoute) {
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
  }

  recalculate(): void {
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
