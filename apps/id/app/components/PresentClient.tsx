import React from "react";
import type { ClientOidcClient } from "~/types/ClientOidcClient";
import { ClientDescription } from "./ClientDescription";

type Props = {
  client: ClientOidcClient;
  title?: React.ReactNode;
  append?: React.ReactNode;
  descriptionKey?: string;
  descriptionClassName?: string;
};

export function PresentClient({
  client,
  title,
  append,
  descriptionKey,
  descriptionClassName,
}: Readonly<Props>) {
  return (
    <div className="lg:me-8">
      {client.logoUri && (
        <img
          src={client.logoUri}
          className="w-12 h-12 mb-4 rounded-md"
          alt=""
          width={48}
          height={48}
        />
      )}
      {title && <h1 className="text-2xl mb-4">{title}</h1>}
      <p className={`mb-8 ${descriptionClassName}`}>
        <ClientDescription
          name={client.clientName}
          descriptionKey={descriptionKey}
        />
      </p>
      {append && <div>{append}</div>}
    </div>
  );
}
