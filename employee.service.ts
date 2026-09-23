import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api.config';

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  joiningDate: string;
  status: 'Active' | 'On leave';
  initials: string;
  color: 'blue' | 'purple' | 'orange' | 'green';
}

interface ApiEmployee {
  id: number;
  name: string;
  department: string;
  role: string;
  contactInfo: string;
  joiningDate: string;
}

interface EmployeePage {
  content: ApiEmployee[];
  totalElements: number;
}

interface DepartmentCount {
  department: string;
  count: number;
}

export interface EmployeePayload {
  name: string;
  department: string;
  role: string;
  contactInfo: string;
  joiningDate: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  readonly employees = signal<Employee[]>([]);
  readonly totalElements = signal(0);
  readonly departmentCounts = signal<DepartmentCount[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const params = new HttpParams().set('page', 0).set('size', 1000).set('sort', 'name,asc');
    this.http.get<EmployeePage>(`${API_URL}/employees`, { params }).subscribe({
      next: (page) => {
        this.employees.set(page.content.map((employee) => this.fromApi(employee)));
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error.status === 0 ? 'Cannot connect to the API on port 8080.' : 'Employees could not be loaded.');
        this.loading.set(false);
      },
    });
    this.http.get<DepartmentCount[]>(`${API_URL}/employees/department-counts`).subscribe({
      next: (counts) => this.departmentCounts.set(counts),
    });
  }

  add(employee: Employee): Observable<ApiEmployee> {
    return this.http.post<ApiEmployee>(`${API_URL}/employees`, this.toApi(employee)).pipe(
      tap(() => this.load()),
    );
  }

  update(employee: Employee): Observable<ApiEmployee> {
    return this.http.put<ApiEmployee>(`${API_URL}/employees/${employee.id}`, this.toApi(employee)).pipe(
      tap(() => this.load()),
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/employees/${id}`).pipe(
      tap(() => this.load()),
    );
  }

  private fromApi(employee: ApiEmployee): Employee {
    const initials = employee.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const colors: Employee['color'][] = ['blue', 'purple', 'orange', 'green'];
    return {
      id: String(employee.id),
      name: employee.name,
      department: employee.department,
      role: employee.role,
      email: employee.contactInfo,
      phone: employee.contactInfo,
      joiningDate: employee.joiningDate,
      status: 'Active',
      initials,
      color: colors[employee.id % colors.length],
    };
  }

  private toApi(employee: Employee): EmployeePayload {
    return {
      name: employee.name,
      department: employee.department,
      role: employee.role,
      contactInfo: employee.email || employee.phone,
      joiningDate: employee.joiningDate,
    };
  }
}
