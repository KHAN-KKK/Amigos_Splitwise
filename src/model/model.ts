export interface User {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // User ID
  splitAmong: string[]; // Array of User IDs
}

export interface Settlement {
  from: string; // User name
  to: string; // User name
  amount: number;
}