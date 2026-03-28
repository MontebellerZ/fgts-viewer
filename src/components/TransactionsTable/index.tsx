import type { TableTransaction } from "../../types";
import { getEmployerColor } from "../../utils/employer";
import { formatBRL } from "../../utils/format";
import "./index.css";

interface TransactionsTableProps {
  transactions: TableTransaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
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
        {transactions.map((t) => (
          <tr key={`${t.date}-${t.description}-${t.value}`}>
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
