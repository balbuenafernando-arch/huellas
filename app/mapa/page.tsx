"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PetCard } from "@/components/pet-card";
import { PetMap } from "@/components/pet-map";
import type { Pet } from "@/lib/demo-data";
import { listReports, reportToLegacyPet } from "@/lib/sprint14-store";

export default function MapaPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [district, setDistrict] = useState("Todos");
  useEffect(() => { listReports(true).then((reports) => setPets(reports.map(reportToLegacyPet))); }, []);
  const districts = ["Todos", ...Array.from(new Set(pets.map((pet) => pet.distrito)))];
  const filtered = useMemo(() => district === "Todos" ? pets : pets.filter((pet) => pet.distrito === district), [pets, district]);

  return (
    <main className="container py-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h1 className="font-serif text-4xl">Mapa</h1><p className="mt-2 text-[#6B6860]">Rojo: perdido · Verde: encontrado · Gris: reunido</p></div><div className="search-box md:w-72"><Search size={18} /><select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full bg-transparent outline-none">{districts.map((d) => <option key={d}>{d}</option>)}</select></div></div>
      <div className="map-panel min-h-[360px] md:min-h-[520px]"><PetMap pets={filtered} /></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((pet) => <PetCard key={pet.id} pet={pet} />)}</div>
    </main>
  );
}
