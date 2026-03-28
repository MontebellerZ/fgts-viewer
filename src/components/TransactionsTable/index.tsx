import type { TableTransaction } from "../../types";
import "./index.css";

interface TransactionsTableProps {
  transactions: TableTransaction[];
  formatBRL: (value: number) => string;
  getEmployerColor: (initials: string) => string;
}

export function TransactionsTable({ transactions, formatBRL, getEmployerColor }: TransactionsTableProps) {
  if (transactions.length === 0) return null;

  return (
    <table className="transactions-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Lancamento</th>
          <th>Valor</th>
          <th>Saldo</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t, i) => (
          <tr key={i}>
            <td>{t.date}</td>
            <td>
              {t.employerInitials ? (
                <>
                  <span className="employer-prefix" style={{ color: getEmployerColor(t.employerInitials) }}>
                    {t.employerInitials}
                  </span>
                  {" - "}
                  {t.description}
                </>
              ) : (
                t.description
              )}
            </td>
            <td className={t.value < 0 ? "negative" : "positive"}>{formatBRL(t.value)}</td>
            <td>{formatBRL(t.balance)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
