import type { FileViewData } from "../../types";
import "./index.css";

interface ContractCardsProps {
  cards: FileViewData[];
  formatBRL: (value: number) => string;
}

export function ContractCards({ cards, formatBRL }: ContractCardsProps) {
  if (cards.length === 0) return null;

  return (
    <div className="contracts-stack">
      {cards.map((fileData) => {
        const finalTotal =
          fileData.transactions.length > 0
            ? fileData.transactions[fileData.transactions.length - 1].balance
            : null;

        return (
          <section className="contract-card" key={fileData.id}>
            <h2>{fileData.contractData.employer}</h2>
            <div className="contract-grid">
              <div className="contract-item">
                <span>Data de admissao</span>
                <strong>{fileData.contractData.admissionDate}</strong>
              </div>
              <div className="contract-item">
                <span>Data de opcao</span>
                <strong>{fileData.contractData.optionDate}</strong>
              </div>
              <div className="contract-item">
                <span>Data de afastamento</span>
                <strong>{fileData.contractData.terminationDate}</strong>
              </div>
              <div className="contract-item">
                <span>Taxa de juros anual</span>
                <strong>{fileData.contractData.annualRate}</strong>
              </div>
              <div className="contract-item">
                <span>Valor para fins recisorios</span>
                <strong>{fileData.contractData.terminationValue}</strong>
              </div>
              <div className="contract-item contract-item-highlight">
                <span>Valor total</span>
                <strong>{finalTotal === null ? "-" : formatBRL(finalTotal)}</strong>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
