import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Transaction } from './payment.service';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <section class="panel table-panel transaction-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">ACTIVITY</p><h2>Transaction history</h2><p class="muted">Recent employee payments and their status.</p></div>
        <span class="transaction-count">{{ transactions.length }} total</span>
      </div>
      <div class="table-wrap">
        <table class="transaction-table">
          <thead><tr><th>EMPLOYEE</th><th>AMOUNT</th><th>METHOD</th><th>STATUS</th><th>DATE</th></tr></thead>
          <tbody>
            @for (transaction of transactions; track transaction.id) {
              <tr>
                <td><strong>{{ transaction.employeeName }}</strong><small>{{ transaction.id }}</small></td>
                <td class="amount-cell">{{ transaction.amount | currency:'INR':'symbol':'1.2-2' }}</td>
                <td>{{ transaction.method }}</td>
                <td><span class="status" [class.status-failed]="transaction.status === 'Failed'" [class.status-pending]="transaction.status === 'Pending'"><i></i>{{ transaction.status }}</span></td>
                <td>{{ transaction.date | date:'MMM d, y, h:mm a' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-state">No transactions yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class TransactionListComponent {
  @Input() transactions: Transaction[] = [];
}
