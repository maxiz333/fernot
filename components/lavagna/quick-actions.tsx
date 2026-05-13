"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { FileText, Plus, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const quickCreateOptions = [
  {
    id: "contatto",
    label: "Contatto",
    icon: UserRound,
    shelfId: "clienti",
    type: "contatto" as const,
    title: "Nuovo Contatto",
    content: "Nome:\nNumero:\nNote: ",
  },
  {
    id: "preventivo",
    label: "Preventivo",
    icon: FileText,
    shelfId: "preventivi",
    type: "preventivo" as const,
    title: "Nuovo Preventivo",
    content: "Nome:\nNumero:\nOrdine:\nNote: ",
  },
  {
    id: "vuoto",
    label: "Foglio Vuoto",
    icon: Plus,
    shelfId: "preventivi",
    type: "vuoto" as const,
    title: "Nuovo Foglio",
    content: "",
  },
]

export function QuickActions() {
  const { addSlip, setActiveSlip, activeSidebarShelfId } = useStore()
  const [isCreating, setIsCreating] = useState(false)
  const [open, setOpen] = useState(false)

  const handleCreateSlip = async (option: (typeof quickCreateOptions)[number]) => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const targetShelf = activeSidebarShelfId ?? option.shelfId
      const newId = await addSlip({
        shelfId: targetShelf,
        title: option.title,
        content: option.content,
        type: option.type,
      })
      setActiveSlip(newId)
      setOpen(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={isCreating}
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Apri azioni nuovo foglio</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          {quickCreateOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                void handleCreateSlip(option)
              }}
              disabled={isCreating}
              className="gap-2"
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
