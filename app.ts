import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Employee, EmployeeService } from './employee.service';
import { PaymentFormComponent } from './payment-form.component';
import { PaymentFormValue, PaymentService, Transaction } from './payment.service';
import { TransactionListComponent } from './transaction-list.component';

type View = 'overview' | 'employees' | 'payments' | 'reports' | 'settings';

interface RazorpayResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResult) => void;
  modal: { ondismiss: () => void };
  prefill: { name: string; email: string };
  theme: { color: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, PaymentFormComponent, TransactionListComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(PaymentService);

  protected readonly employees = this.employeeService.employees;
  protected readonly view = signal<View>('overview');
  protected readonly search = signal('');
  protected readonly department = signal('All departments');
  protected readonly sortField = signal<keyof Employee>('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 6;
  protected readonly showEmployeeModal = signal(false);
  protected readonly showDeleteModal = signal(false);
  protected readonly selectedEmployee = signal<Employee | null>(null);
  protected readonly editingEmployee = signal<Employee | null>(null);
  protected readonly showProfileMenu = signal(false);
  protected readonly notice = signal('');
  protected readonly isLoggedIn = computed(() => !!this.authService.token());
  protected readonly role = this.authService.role;
  protected readonly loginEmail = signal('');
  protected readonly loginPassword = signal('');
  protected readonly loginError = signal('');
  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly paymentError = signal('');
  protected readonly paymentProcessing = signal(false);
  protected readonly employeeServiceLoading = this.employeeService.loading;

  protected employeeForm: Employee = this.emptyEmployee();

  protected readonly canManageEmployees = computed(() => {
    const role = this.role().toUpperCase();
    return role.includes('ADMIN') || role.includes('MANAGER');
  });
  protected readonly canDeleteEmployees = computed(() => this.role().toUpperCase().includes('ADMIN'));

  constructor() {
    if (this.isLoggedIn()) {
      this.employeeService.load();
      this.loadTransactions();
    }
  }

  protected readonly departments = computed(() => [
    'All departments',
    ...new Set(this.employees().map((employee) => employee.department)),
  ]);

  protected readonly filteredEmployees = computed(() => {
    const query = this.search().trim().toLowerCase();
    const selectedDepartment = this.department();
    const field = this.sortField();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return this.employees()
      .filter((employee) => {
        const matchesQuery =
          !query ||
          [employee.name, employee.id, employee.role, employee.department, employee.email]
            .join(' ')
            .toLowerCase()
            .includes(query);
        return matchesQuery && (selectedDepartment === 'All departments' || employee.department === selectedDepartment);
      })
      .sort((a, b) => String(a[field]).localeCompare(String(b[field])) * direction);
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize)));
  protected readonly pagedEmployees = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEmployees().slice(start, start + this.pageSize);
  });
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly departmentStats = computed(() =>
    this.departments()
      .filter((department) => department !== 'All departments')
      .map((department) => ({
        name: department,
        count: this.employees().filter((employee) => employee.department === department).length,
      }))
      .sort((a, b) => b.count - a.count),
  );
  protected readonly activeCount = computed(() => this.employees().filter((employee) => employee.status === 'Active').length);

  protected setView(view: View): void {
    this.view.set(view);
    this.currentPage.set(1);
    if (view === 'payments') {
      if (this.employees().length === 0) {
        this.employeeService.load();
      }
      this.loadTransactions();
    }
  }

  protected updateSearch(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  protected updateDepartment(value: string): void {
    this.department.set(value);
    this.currentPage.set(1);
  }

  protected sortBy(field: keyof Employee): void {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  protected openAddModal(): void {
    this.editingEmployee.set(null);
    this.employeeForm = this.emptyEmployee();
    this.showEmployeeModal.set(true);
  }

  protected openEditModal(employee: Employee): void {
    this.editingEmployee.set(employee);
    this.employeeForm = { ...employee };
    this.showEmployeeModal.set(true);
  }

  protected closeModal(): void {
    this.showEmployeeModal.set(false);
    this.showDeleteModal.set(false);
  }

  protected saveEmployee(): void {
    if (!this.employeeForm.name || !this.employeeForm.department || !this.employeeForm.role || !this.employeeForm.email) {
      return;
    }
    if (this.editingEmployee()) {
      this.employeeService.update(this.employeeForm).subscribe({
        next: () => this.showNotice('Employee details updated'),
        error: () => this.showNotice('The employee could not be updated'),
      });
    } else {
      this.employeeService.add(this.employeeForm).subscribe({
        next: () => this.showNotice('Employee added successfully'),
        error: () => this.showNotice('The employee could not be added'),
      });
    }
    this.closeModal();
  }

  protected requestDelete(employee: Employee): void {
    this.selectedEmployee.set(employee);
    this.showDeleteModal.set(true);
  }

  protected confirmDelete(): void {
    const employee = this.selectedEmployee();
    if (employee) {
      this.employeeService.remove(employee.id).subscribe({
        next: () => this.showNotice('Employee removed'),
        error: () => this.showNotice('The employee could not be removed'),
      });
    }
    this.closeModal();
  }

  protected changePage(page: number): void {
    this.currentPage.set(Math.min(Math.max(page, 1), this.totalPages()));
  }

  protected login(): void {
    if (!this.loginEmail() || !this.loginPassword()) {
      this.loginError.set('Enter your email and password to continue.');
      return;
    }
    this.authService.login(this.loginEmail(), this.loginPassword()).subscribe({
      next: () => {
        this.loginError.set('');
        this.employeeService.load();
        this.loadTransactions();
      },
      error: (error) => {
        this.loginError.set(
          error.status === 0
            ? 'Cannot connect to the API on port 8080.'
            : error.status === 401
              ? 'The backend rejected these credentials. Use a registered account.'
              : 'Sign-in failed. Please try again.',
        );
      },
    });
  }

  protected logout(): void {
    this.authService.logout();
    this.showProfileMenu.set(false);
  }

  protected showNotice(message: string): void {
    this.notice.set(message);
    window.setTimeout(() => this.notice.set(''), 2800);
  }

  protected apiError(): string {
    return this.employeeService.error();
  }

  protected makePayment(value: PaymentFormValue): void {
    this.paymentProcessing.set(true);
    this.paymentService.createOrder(value).subscribe({
      next: (order) => this.openRazorpay(order, value),
      error: (error: HttpErrorResponse) => {
        this.paymentProcessing.set(false);
        const message =
          error.status === 401
            ? 'Your session has expired. Please sign in again.'
            : error.status === 400
              ? error.error?.message ?? 'The backend could not create the Razorpay order.'
              : error.status === 0
                ? 'Cannot connect to the API on port 8080.'
                : 'Unable to create the payment order.';
        this.showNotice(message);
      },
    });
  }

  private openRazorpay(order: { orderId: string; amount: number; currency: string; keyId?: string }, value: PaymentFormValue): void {
    const Razorpay = window.Razorpay;
    if (!Razorpay) {
      this.paymentProcessing.set(false);
      this.showNotice('Razorpay could not be loaded. Please try again.');
      return;
    }

    const employee = this.employees().find((item) => item.id === value.employeeId);
    const checkout = new Razorpay({
      key: order.keyId ?? 'rzp_test_replace_with_backend_key',
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: 'Acme Inc.',
      description: value.description,
      order_id: order.orderId,
      handler: (response) => {
        this.paymentService.verifyPayment(response).subscribe({
          next: () => {
            this.paymentProcessing.set(false);
            this.showNotice(`Payment to ${employee?.name ?? 'employee'} completed successfully`);
            this.loadTransactions();
          },
          error: () => {
            this.paymentProcessing.set(false);
            this.showNotice('Payment received, but verification failed');
          },
        });
      },
      modal: { ondismiss: () => this.paymentProcessing.set(false) },
      prefill: { name: employee?.name ?? '', email: employee?.email ?? '' },
      theme: { color: '#2868df' },
    });
    checkout.on('payment.failed', () => {
      this.paymentProcessing.set(false);
      this.showNotice('Payment failed. No amount was charged.');
    });
    checkout.open();
  }

  private loadTransactions(): void {
    if (!this.isLoggedIn()) {
      return;
    }
    this.paymentService.getTransactions().subscribe({
      next: (transactions) => {
        this.paymentError.set('');
        this.transactions.set(transactions);
      },
      error: () => this.paymentError.set('Transaction history could not be loaded.'),
    });
  }

  private emptyEmployee(): Employee {
    return {
      id: '',
      name: '',
      department: 'Engineering',
      role: '',
      email: '',
      phone: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      status: 'Active',
      initials: '',
      color: 'blue',
    };
  }
}
