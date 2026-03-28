export interface Transaction {
  date: string;
  description: string;
  value: number;
  balance: number;
}

export interface TableTransaction extends Transaction {
  employerInitials?: string;
}

export interface ContractData {
  employer: string;
  admissionDate: string;
  optionDate: string;
  terminationDate: string;
  annualRate: string;
  terminationValue: string;
}

export interface ChartPoint {
  month: string;
  totalBalance: number;
  jamCredit: number; // acumulado (total corrido)
  creditMonth: number; // creditos nao-JAM do mes
  jamMonth: number; // credito JAM so do mes
}

export interface FileViewData {
  id: string;
  fileName: string;
  contractData: ContractData;
  transactions: Transaction[];
}

export interface MonthlyPoint {
  month: string;
  totalBalance: number;
  jamMonth: number; // credito JAM so do mes
  creditMonth: number; // creditos nao-JAM do mes
}
