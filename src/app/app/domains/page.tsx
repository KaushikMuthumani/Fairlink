"use client";

import { useEffect, useState } from "react";

type Domain = {
  id: string;
  hostname: string;
  verified: boolean;
};

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [hostname, setHostname] = useState("");

  async function load() {
    const res = await fetch("/api/domains", { credentials: "include" });
    const data = await res.json();
    setDomains(data.domains ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ hostname }),
    });

    setHostname("");
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Domains</h1>

      <div className="flex gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="go.client.com"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
        />
        <button
          onClick={add}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {domains.map((d) => (
          <div key={d.id} className="border rounded p-3">
            {d.hostname}
          </div>
        ))}
      </div>
    </div>
  );
}
