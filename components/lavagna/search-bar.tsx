"use client"

import { useStore } from "@/lib/store"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useStore()

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Cerca nei fogli..."
        className="h-9 pl-9 pr-8 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchQuery("")}
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Cancella ricerca</span>
        </Button>
      )}
    </div>
  )
}
