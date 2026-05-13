"use client"

import { useCallback, useEffect, useRef } from "react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Lock, LockOpen, Trash2, Zap, ZapOff, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function SlipEditor() {
  const {
    slips,
    activeSlipId,
    isReadOnly,
    updateSlip,
    saveSlip,
    removeSlip,
    setReadOnly,
    setActiveSlip,
    shelves,
    isSaving,
    lastSavedAt,
    syncError,
  } = useStore()

  const activeSlip = slips.find((s) => s.id === activeSlipId)
  const activeShelf = shelves.find((s) => s.id === activeSlip?.shelfId)
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const queueAutosave = useCallback(
    (slipId: string) => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
      autosaveTimeoutRef.current = setTimeout(() => {
        autosaveTimeoutRef.current = null
        void saveSlip(slipId)
      }, 500)
    },
    [saveSlip]
  )

  const flushAutosave = useCallback(
    (slipId: string) => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }
      void saveSlip(slipId)
    },
    [saveSlip]
  )

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeSlipId || isReadOnly) return
      void updateSlip(activeSlipId, { title: e.target.value }, { persist: false })
      queueAutosave(activeSlipId)
    },
    [activeSlipId, isReadOnly, queueAutosave, updateSlip]
  )

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!activeSlipId || isReadOnly) return
      void updateSlip(activeSlipId, { content: e.target.value }, { persist: false })
      queueAutosave(activeSlipId)
    },
    [activeSlipId, isReadOnly, queueAutosave, updateSlip]
  )

  const handleToggleUrgent = () => {
    if (!activeSlipId || !activeSlip) return
    void updateSlip(activeSlipId, { isUrgent: !activeSlip.isUrgent })
  }

  const handleDelete = () => {
    if (!activeSlipId) return
    void removeSlip(activeSlipId)
    setActiveSlip(null)
  }

  const handleCloseSlip = () => {
    if (activeSlipId && !isReadOnly) {
      flushAutosave(activeSlipId)
    }
    setActiveSlip(null)
  }

  useEffect(() => {
    if (activeSlip && titleRef.current && !isReadOnly) {
      titleRef.current.focus()
    }
  }, [activeSlipId, isReadOnly])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  const saveStatusText = syncError
    ? "Errore sync"
    : isSaving
      ? "Salvataggio..."
      : "Sincronizzato"

  const saveStatusDotClass = syncError
    ? "bg-destructive"
    : isSaving
      ? "bg-amber animate-pulse"
      : "bg-success animate-pulse"

  if (!activeSlip) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-card via-card to-secondary/30">
        <div className="text-center p-8">
          <div className="mx-auto mb-6 h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg">
            <span className="text-5xl">📝</span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nessun foglio selezionato</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Seleziona un foglio dalla lista oppure creane uno nuovo con il pulsante <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">➕</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-card transition-all duration-300",
        activeSlip.isUrgent && "ring-2 ring-urgent/50 ring-inset bg-gradient-to-br from-urgent/5 via-card to-card"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6 bg-gradient-to-r from-transparent via-card to-secondary/20">
        <div className="flex items-center gap-3">
          {/* Shelf badge */}
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 shadow-sm">
            <span className="text-sm">📁</span>
            <span className="text-xs font-medium text-secondary-foreground">{activeShelf?.name || "Generale"}</span>
          </div>
          
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 bg-success/10 rounded-full px-2.5 py-1">
            <span className={cn("h-2 w-2 rounded-full", saveStatusDotClass)} />
            <span className="text-[10px] font-semibold text-success hidden sm:inline">{saveStatusText}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleCloseSlip} className="rounded-full" title="Chiudi foglio">
            <X className="h-4 w-4" />
            <span className="sr-only">Chiudi foglio</span>
          </Button>
          {/* Urgency Toggle */}
          <Button
            variant={activeSlip.isUrgent ? "destructive" : "outline"}
            size="sm"
            onClick={handleToggleUrgent}
            disabled={isReadOnly}
            className={cn(
              "gap-1.5 rounded-full transition-all",
              activeSlip.isUrgent && "shadow-lg shadow-destructive/25"
            )}
          >
            {activeSlip.isUrgent ? (
              <>
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">🔥 Urgente</span>
              </>
            ) : (
              <>
                <ZapOff className="h-4 w-4" />
                <span className="hidden sm:inline">Urgenza</span>
              </>
            )}
          </Button>

          {/* Read-only Toggle */}
          <Button
            variant={isReadOnly ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setReadOnly(!isReadOnly)}
            className={cn(
              "gap-1.5 rounded-full",
              isReadOnly && "bg-amber/20 text-amber border-amber/30"
            )}
          >
            {isReadOnly ? (
              <>
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">🔒 Bloccato</span>
              </>
            ) : (
              <>
                <LockOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Blocca</span>
              </>
            )}
          </Button>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Elimina</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <span>🗑️</span> Eliminare questo foglio?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Questa azione non può essere annullata. Il foglio verrà eliminato permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full gap-1">
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl">
          {/* Title with icon */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-1">
              {!isReadOnly ? (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Pencil className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-amber/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-amber" />
                </div>
              )}
            </div>
            <input
              ref={titleRef}
              type="text"
              value={activeSlip.title}
              onChange={handleTitleChange}
              onBlur={() => {
                if (activeSlipId && !isReadOnly) flushAutosave(activeSlipId)
              }}
              readOnly={isReadOnly}
              placeholder="Titolo del foglio..."
              className={cn(
                "flex-1 border-none bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0",
                isReadOnly && "cursor-default"
              )}
            />
          </div>
          <div className="ml-11 mt-2 text-xs text-muted-foreground">
            Creato il {formatDate(activeSlip.createdAt)}
          </div>

          {/* Timestamps */}
          <div className="mt-4 ml-11 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-1">
              <span>📅</span>
              <span className="text-muted-foreground">Creato: {formatDate(activeSlip.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-1">
              <span>✏️</span>
              <span className="text-muted-foreground">Modificato: {formatDate(activeSlip.updatedAt)}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 ml-11 h-px bg-gradient-to-r from-border via-border to-transparent" />

          {/* Content */}
          <div className="ml-11">
            <textarea
              ref={contentRef}
              value={activeSlip.content}
              onChange={handleContentChange}
              onBlur={() => {
                if (activeSlipId && !isReadOnly) flushAutosave(activeSlipId)
              }}
              readOnly={isReadOnly}
              placeholder="Scrivi qui il contenuto del foglio... ✍️"
              className={cn(
                "min-h-[400px] w-full resize-none border-none bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0",
                isReadOnly && "cursor-default"
              )}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t border-border px-6 py-2 bg-gradient-to-r from-secondary/20 to-transparent">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{activeSlip.content.length} caratteri</span>
          <span className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", saveStatusDotClass)} />
            {syncError
              ? "Errore salvataggio"
              : isSaving
                ? "Salvataggio automatico..."
                : `Salvato${lastSavedAt ? ` ${formatDate(lastSavedAt)}` : ""}`}
          </span>
        </div>
      </div>
    </div>
  )
}
