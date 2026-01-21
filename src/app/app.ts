import { Component } from '@angular/core';
import { Expense, Settlement, User } from '../model/model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
    // User Management
  users: User[] = [];
  newUserName: string = '';

  // Expense Management
  expenses: Expense[] = [];
  newExpense = {
    description: '',
    amount: 0,
    paidBy: '',
    splitAmong: [] as string[]
  };

  // Settlement Results
  settlements: Settlement[] = [];
  showResults: boolean = false;

  // User Balance (for display)
  userBalances: Map<string, number> = new Map();

  // ============================================
  // USER MANAGEMENT METHODS
  // ============================================

  addUser(): void {
    if (this.newUserName.trim()) {
      const user: User = {
        id: this.generateId(),
        name: this.newUserName.trim()
      };
      this.users.push(user);
      this.newUserName = '';
    }
  }

  removeUser(userId: string): void {
    this.users = this.users.filter(u => u.id !== userId);
    // Remove user from expenses
    this.expenses = this.expenses.filter(e => e.paidBy !== userId);
    this.expenses.forEach(e => {
      e.splitAmong = e.splitAmong.filter(id => id !== userId);
    });
  }

  // ============================================
  // EXPENSE MANAGEMENT METHODS
  // ============================================

  addExpense(): void {
    if (this.newExpense.description.trim() && 
        this.newExpense.amount > 0 && 
        this.newExpense.paidBy &&
        this.newExpense.splitAmong.length > 0) {
      
      const expense: Expense = {
        id: this.generateId(),
        description: this.newExpense.description.trim(),
        amount: this.newExpense.amount,
        paidBy: this.newExpense.paidBy,
        splitAmong: [...this.newExpense.splitAmong]
      };

      this.expenses.push(expense);
      
      // Reset form
      this.newExpense = {
        description: '',
        amount: 0,
        paidBy: '',
        splitAmong: []
      };
    }
  }

  removeExpense(expenseId: string): void {
    this.expenses = this.expenses.filter(e => e.id !== expenseId);
  }

  toggleUserInSplit(userId: string): void {
    const index = this.newExpense.splitAmong.indexOf(userId);
    if (index > -1) {
      this.newExpense.splitAmong.splice(index, 1);
    } else {
      this.newExpense.splitAmong.push(userId);
    }
  }

  isUserInSplit(userId: string): boolean {
    return this.newExpense.splitAmong.includes(userId);
  }

  selectAllUsers(): void {
    this.newExpense.splitAmong = this.users.map(u => u.id);
  }

  deselectAllUsers(): void {
    this.newExpense.splitAmong = [];
  }

  // ============================================
  // CALCULATION METHODS
  // ============================================

  calculateSettlements(): void {
    if (this.expenses.length === 0) {
      alert('Please add at least one expense!');
      return;
    }

    if (this.users.length === 0) {
      alert('Please add users first!');
      return;
    }

    // Step 1: Calculate balance for each user
    const balances = new Map<string, number>();
    
    // Initialize all users with 0 balance
    this.users.forEach(user => {
      balances.set(user.id, 0);
    });

    // Calculate balances
    this.expenses.forEach(expense => {
      const sharePerPerson = expense.amount / expense.splitAmong.length;
      
      // Person who paid gets credit
      const currentBalance = balances.get(expense.paidBy) || 0;
      balances.set(expense.paidBy, currentBalance + expense.amount);
      
      // Each person in split gets debited
      expense.splitAmong.forEach(userId => {
        const userBalance = balances.get(userId) || 0;
        balances.set(userId, userBalance - sharePerPerson);
      });
    });

    // Store balances for display
    this.userBalances = balances;

    // Step 2: Calculate settlements (who owes whom)
    this.settlements = this.calculateOptimalSettlements(balances);
    this.showResults = true;
  }

  calculateOptimalSettlements(balances: Map<string, number>): Settlement[] {
    const settlements: Settlement[] = [];
    
    // Create arrays of debtors and creditors
    const debtors: { userId: string; amount: number }[] = [];
    const creditors: { userId: string; amount: number }[] = [];

    balances.forEach((balance, userId) => {
      if (balance < -0.01) { // Owes money (with small tolerance for floating point)
        debtors.push({ userId, amount: Math.abs(balance) });
      } else if (balance > 0.01) { // Is owed money
        creditors.push({ userId, amount: balance });
      }
    });

    // Sort for optimal matching
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // Match debtors with creditors
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      const settlementAmount = Math.min(debtor.amount, creditor.amount);
      
      if (settlementAmount > 0.01) { // Only add if significant
        settlements.push({
          from: this.getUserName(debtor.userId),
          to: this.getUserName(creditor.userId),
          amount: parseFloat(settlementAmount.toFixed(2))
        });
      }

      debtor.amount -= settlementAmount;
      creditor.amount -= settlementAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return settlements;
  }

  resetCalculation(): void {
    this.settlements = [];
    this.showResults = false;
    this.userBalances.clear();
  }

  clearAllExpenses(): void {
    if (confirm('Are you sure you want to clear all expenses?')) {
      this.expenses = [];
      this.resetCalculation();
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getUserName(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  }

  getExpensePaidBy(expense: Expense): string {
    return this.getUserName(expense.paidBy);
  }

  getExpenseSplitNames(expense: Expense): string {
    return expense.splitAmong.map(id => this.getUserName(id)).join(', ');
  }

  getUserBalance(userId: string): number {
    return this.userBalances.get(userId) || 0;
  }

  getBalanceClass(balance: number): string {
    if (balance > 0.01) return 'positive';
    if (balance < -0.01) return 'negative';
    return 'neutral';
  }

  getTotalExpenses(): number {
    return this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  isBalanceSettled(balance: number): boolean {
    return Math.abs(balance) <= 0.01;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
