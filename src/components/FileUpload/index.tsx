import type { ChangeEventHandler } from "react";
import "./index.css";

interface FileUploadProps {
  onChange: ChangeEventHandler<HTMLInputElement>;
  loading: boolean;
}

export function FileUpload({ onChange, loading }: FileUploadProps) {
  return (
    <div className="file-upload">
      <label htmlFor="fgts-file-input" className="file-upload-button">
        Selecionar PDF(s)
      </label>
      <input
        id="fgts-file-input"
        className="file-upload-input"
        type="file"
        accept="application/pdf"
        multiple
        onChange={onChange}
      />
      <p className="file-upload-hint">Envie um ou mais extratos em PDF</p>
      {loading && <p className="file-upload-loading">Processando...</p>}
    </div>
  );
}
