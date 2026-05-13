import { create } from "zustand"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export type SlipType = "vuoto" | "contatto" | "preventivo"

export interface Slip {
  id: string
  title: string
  content: string
  shelfId: string
  type: SlipType
  isUrgent: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Shelf {
  id: string
  name: string
  icon: string
}

interface StoreState {
  shelves: Shelf[]
  slips: Slip[]
  activeSlipId: string | null
  activeSidebarShelfId: string | null
  isReadOnly: boolean
  searchQuery: string
  isLoading: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  syncError: string | null

  // Actions
  addShelf: (name: string, icon?: string) => void
  removeShelf: (id: string) => void
  renameShelf: (id: string, name: string) => void

  subscribeToSlips: () => Unsubscribe
  addSlip: (
    input:
      | string
      | {
          shelfId: string
          title?: string
          content?: string
          type?: SlipType
        }
  ) => Promise<string>
  removeSlip: (id: string) => Promise<void>
  updateSlip: (
    id: string,
    updates: Partial<Pick<Slip, "title" | "content" | "isUrgent" | "shelfId" | "type">>,
    options?: { persist?: boolean }
  ) => Promise<void>
  saveSlip: (id: string) => Promise<void>
  moveSlipToShelf: (slipId: string, shelfId: string) => Promise<void>

  setActiveSlip: (id: string | null) => void
  setActiveSidebarShelf: (id: string | null) => void
  setReadOnly: (value: boolean) => void
  setSearchQuery: (query: string) => void

  getSlipsByShelf: (shelfId: string) => Slip[]
  getFilteredSlips: () => Slip[]
}

const defaultShelves: Shelf[] = [
  { id: "preventivi", name: "Preventivi", icon: "file-text" },
  { id: "ordini", name: "Ordini Articoli", icon: "package" },
  { id: "clienti", name: "Numeri Clienti", icon: "users" },
]

const slipsCollection = collection(db, "slips")
const defaultTitleByType: Record<SlipType, string> = {
  vuoto: "Nuovo Foglio",
  contatto: "Nuovo Contatto",
  preventivo: "Nuovo Preventivo",
}
const saveQueues = new Map<string, Promise<void>>()
let pendingSaveCount = 0

const beginSaving = (set: (partial: Partial<StoreState>) => void) => {
  pendingSaveCount += 1
  if (pendingSaveCount === 1) {
    set({ isSaving: true })
  }
}

const endSaving = (set: (partial: Partial<StoreState>) => void) => {
  pendingSaveCount = Math.max(0, pendingSaveCount - 1)
  if (pendingSaveCount === 0) {
    set({ isSaving: false })
  }
}

const runSerializedSave = (slipId: string, operation: () => Promise<void>) => {
  const previous = saveQueues.get(slipId) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(operation)
  saveQueues.set(slipId, next)
  return next.finally(() => {
    if (saveQueues.get(slipId) === next) {
      saveQueues.delete(slipId)
    }
  })
}

const toDate = (value: unknown): Date => {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  if (value instanceof Date) {
    return value
  }
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value)
  }
  return new Date()
}

export const useStore = create<StoreState>()((set, get) => ({
  shelves: defaultShelves,
  slips: [],
  activeSlipId: null,
  activeSidebarShelfId: null,
  isReadOnly: false,
  searchQuery: "",
  isLoading: true,
  isSaving: false,
  lastSavedAt: null,
  syncError: null,

  addShelf: (name, icon = "folder") => {
    const id = `shelf-${Date.now()}`
    set((state) => ({
      shelves: [...state.shelves, { id, name, icon }],
    }))
  },

  removeShelf: (id) => {
    set((state) => ({
      shelves: state.shelves.filter((s) => s.id !== id),
      slips: state.slips.filter((s) => s.shelfId !== id),
      activeSidebarShelfId: state.activeSidebarShelfId === id ? null : state.activeSidebarShelfId,
    }))
  },

  renameShelf: (id, name) => {
    set((state) => ({
      shelves: state.shelves.map((s) => (s.id === id ? { ...s, name } : s)),
    }))
  },

  subscribeToSlips: () => {
    set({ isLoading: true, syncError: null })
    const slipsQuery = query(slipsCollection, orderBy("updatedAt", "desc"))
    const unsubscribe = onSnapshot(
      slipsQuery,
      (snapshot) => {
        const slips = snapshot.docs.map((item) => {
          const data = item.data() as Partial<Slip>
          return {
            id: item.id,
            title: typeof data.title === "string" ? data.title : "Nuovo Foglio",
            content: typeof data.content === "string" ? data.content : "",
            shelfId: typeof data.shelfId === "string" ? data.shelfId : "preventivi",
            type:
              data.type === "contatto" || data.type === "preventivo" || data.type === "vuoto"
                ? data.type
                : "vuoto",
            isUrgent: Boolean(data.isUrgent),
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          } satisfies Slip
        })

        set((state) => {
          const activeSlipExists = slips.some((s) => s.id === state.activeSlipId)
          return {
            slips,
            activeSlipId:
              state.activeSlipId === null ? null : activeSlipExists ? state.activeSlipId : slips[0]?.id ?? null,
            isLoading: false,
            syncError: null,
          }
        })
      },
      () => {
        set({
          isLoading: false,
          syncError: "Errore di sincronizzazione con Firestore.",
        })
      }
    )
    return unsubscribe
  },

  addSlip: async (input) => {
    const normalizedInput =
      typeof input === "string"
        ? { shelfId: input, type: "vuoto" as SlipType }
        : {
            shelfId: input.shelfId,
            title: input.title,
            content: input.content,
            type: input.type ?? "vuoto",
          }
    const slipType = normalizedInput.type ?? "vuoto"
    const title = normalizedInput.title ?? defaultTitleByType[slipType]
    const content = normalizedInput.content ?? ""
    const now = new Date()
    const payload = {
      title,
      content,
      shelfId: normalizedInput.shelfId,
      type: slipType,
      isUrgent: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    try {
      const docRef = await addDoc(slipsCollection, payload)
      const newSlip: Slip = {
        id: docRef.id,
        title,
        content,
        shelfId: normalizedInput.shelfId,
        type: slipType,
        isUrgent: false,
        createdAt: now,
        updatedAt: now,
      }
      set((state) => ({
        slips: [newSlip, ...state.slips.filter((s) => s.id !== docRef.id)],
        activeSlipId: docRef.id,
        syncError: null,
      }))
      return docRef.id
    } catch {
      set({ syncError: "Impossibile creare il foglio su Firestore." })
      throw new Error("addSlip_failed")
    }
  },

  removeSlip: async (id) => {
    const previous = get().slips
    set((state) => ({
      slips: state.slips.filter((s) => s.id !== id),
      activeSlipId: state.activeSlipId === id ? null : state.activeSlipId,
    }))

    try {
      await deleteDoc(doc(db, "slips", id))
      set({ syncError: null })
    } catch {
      set({
        slips: previous,
        syncError: "Impossibile eliminare il foglio da Firestore.",
      })
    }
  },

  updateSlip: async (id, updates, options) => {
    const shouldPersist = options?.persist ?? true
    const now = new Date()
    set((state) => ({
      slips: state.slips.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: now } : s)),
    }))

    if (!shouldPersist) return

    beginSaving(set)
    try {
      await runSerializedSave(id, async () => {
        await updateDoc(doc(db, "slips", id), {
          ...updates,
          updatedAt: serverTimestamp(),
        })
      })
      set({ lastSavedAt: new Date(), syncError: null })
    } catch {
      set({ syncError: "Errore durante il salvataggio del foglio." })
    } finally {
      endSaving(set)
    }
  },

  saveSlip: async (id) => {
    const slip = get().slips.find((s) => s.id === id)
    if (!slip) return

    beginSaving(set)
    try {
      await runSerializedSave(id, async () => {
        await updateDoc(doc(db, "slips", id), {
          title: slip.title,
          content: slip.content,
          shelfId: slip.shelfId,
          type: slip.type,
          isUrgent: slip.isUrgent,
          updatedAt: serverTimestamp(),
        })
      })
      set({ lastSavedAt: new Date(), syncError: null })
    } catch {
      set({ syncError: "Errore durante l'autosalvataggio." })
    } finally {
      endSaving(set)
    }
  },

  moveSlipToShelf: async (slipId, shelfId) => {
    await get().updateSlip(slipId, { shelfId })
  },

  setActiveSlip: (id) => set({ activeSlipId: id }),
  setActiveSidebarShelf: (id) => set({ activeSidebarShelfId: id }),
  setReadOnly: (value) => set({ isReadOnly: value }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getSlipsByShelf: (shelfId) => {
    return get().slips.filter((s) => s.shelfId === shelfId)
  },

  getFilteredSlips: () => {
    const { slips, searchQuery, activeSidebarShelfId } = get()
    let filtered = slips

    if (activeSidebarShelfId) {
      filtered = filtered.filter((s) => s.shelfId === activeSidebarShelfId)
    }

    if (searchQuery.trim()) {
      const queryText = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) => s.title.toLowerCase().includes(queryText) || s.content.toLowerCase().includes(queryText)
      )
    }

    return [...filtered].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },
}))
