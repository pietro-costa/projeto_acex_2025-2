// frontend/src/components/FaleConosco.tsx
import React from "react";

type Props = {
  companyName?: string;      // Ex.: "FENG" ou "FINTY"
  year?: number;             // Ex.: 2025 (se não passar, usa o atual)
  cnpj?: string;             // Ex.: "29.815.956/0001-23"
  contactTitle?: string;     // Ex.: "Fale Conosco"
  contactName?: string;      // Ex.: "RT Análise"
  email?: string;            // Ex.: "dpo@sisuvp.com"
  className?: string;        // Classes extras no wrapper
  emailClassName?: string;   // Classe para cor do e-mail (ex.: "text-red-500")
};

const FaleConosco: React.FC<Props> = ({
  companyName = "Finty",
  year = new Date().getFullYear(),
  cnpj,
  contactTitle = "Fale Conosco",
  contactName = "Finty Análise",
  email = "finty.adm@gmail.com",
  className = "",
  emailClassName = "text-blue-500",
}) => {
    return (
  <footer className={`mt-8 sm:mt-10 ${className}`}>
    {/* wrapper centralizador */}
    <div className="w-full grid place-items-center px-4">
      {/* largura controlada + borda centralizadas */}
      <div className="w-full max-w-3xl border-t border-slate-700/60 py-6 text-center text-xs sm:text-sm text-slate-400">
        <p className="mb-1 tracking-wide">
          {companyName.toUpperCase()} © {year}. Todos os direitos reservados.
        </p>

        {cnpj && <p className="mb-1">{companyName} Ltda. CNPJ: {cnpj}</p>}

        <p className="mt-2 font-medium text-slate-300">{contactTitle}</p>

        <p className="leading-relaxed">
          {contactName && <span className="block sm:inline">{contactName}</span>}
          {contactName && email && <span className="hidden sm:inline mx-2">•</span>}
          {email && (
            <a
              href={`mailto:${email}`}
              className={`underline-offset-2 hover:underline ${emailClassName}`}
            >
              {email}
            </a>
          )}
        </p>
      </div>
    </div>
  </footer>
);



};

export default FaleConosco;
