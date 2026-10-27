"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function ComparisonSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  // Last query we wrote to the URL, to tell our own updates from outside ones
  const lastPushed = useRef(urlQuery);

  // URL changed elsewhere (e.g. "Clear Filters"): show it in the input
  useEffect(() => {
    if (urlQuery !== lastPushed.current) {
      lastPushed.current = urlQuery;
      setSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    // Nothing to do on mount or when the URL already has this query
    if (searchQuery === lastPushed.current) return;

    const timeout = setTimeout(() => {
      lastPushed.current = searchQuery;
      const params = new URLSearchParams(searchParams.toString());

      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      // New query, so start from the first page
      params.delete("page");

      // replace: typing shouldn't add a history entry per pause
      const query = params.toString();
      router.replace(`/comparisons${query ? `?${query}` : ""}`);
    }, 300); // Debounce search

    return () => clearTimeout(timeout);
  }, [searchQuery, searchParams, router]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search comparisons by title, description, or prompt..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
        aria-label="Search comparisons"
      />
    </div>
  );
}
