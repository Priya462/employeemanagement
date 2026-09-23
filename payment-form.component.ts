import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Employee } from './employee.service';
import { PaymentFormValue } from './payment.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.css',
})
export class PaymentFormComponent {
  @Input() employees: Employee[] = [];
  @Input() loading = false;
  @Input() processing = false;
  @Output() readonly submit = new EventEmitter<PaymentFormValue>();

  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    employeeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected submitForm(): void {
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    if (this.form.valid && value.amount !== null) {
      this.submit.emit({ amount: value.amount, description: value.description, employeeId: value.employeeId });
    }
  }
}
