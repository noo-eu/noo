import Image from "@/components/Image";
import React from "react";
import { ClientDescription } from "./ClientDescription";

export type PresentClientClientProps = {
  name: string;
  logo?: string;
  privacyUrl?: string;
  tosUrl?: string;
};

type Props = {
  client: PresentClientClientProps;
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
      {client.logo && (
        <Image
          src={client.logo}
          className="w-12 h-12 mb-4 rounded-md"
          alt=""
          width={48}
          height={48}
        />
      )}
      {title && <h1 className="text-2xl mb-4">{title}</h1>}
      <p className={`mb-8 ${descriptionClassName}`}>
        <ClientDescription name={client.name} descriptionKey={descriptionKey} />
      </p>
      {append && <div>{append}</div>}
    </div>
  );
}
