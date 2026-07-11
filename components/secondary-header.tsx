"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type SecondaryHeaderProps = {
  title: string;
  description?: string;
  fallbackHref?: string;
  action?: ReactNode;
};

export function SecondaryHeader({ title, description, fallbackHref = "/", action }: SecondaryHeaderProps) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <div className="secondary-header">
      <button type="button" onClick={goBack} className="secondary-back">
        <ArrowLeft size={18} />
        <span>Volver</span>
      </button>
      <div className="secondary-title-row">
        <div>
          <h1 className="font-serif text-4xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-[#6B6860]">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
