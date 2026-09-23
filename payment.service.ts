import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api.config';

export interface PaymentFormValue {
  amount: number;
  description: string;
  employeeId: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  keyId?: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface Transaction {
  id: string;
  employeeName: string;
  amount: number;
  method: string;
  status: 'Success' | 'Failed' | 'Pending';
  date: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  createOrder(value: PaymentFormValue): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${API_URL}/payments/create-order`, {
      employeeId: Number(value.employeeId),
      amount: value.amount,
      currency: 'INR',
      receipt: `employee-${value.employeeId}-${Date.now()}`,
    });
  }

  verifyPayment(payment: PaymentVerification): Observable<void> {
    return this.http.post<void>(`${API_URL}/payments/verify`, payment);
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${API_URL}/payments/transactions`);
  }
}
