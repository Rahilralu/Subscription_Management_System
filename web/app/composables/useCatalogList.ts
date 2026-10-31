interface CatalogItem {
  id: number
  name: string
}

interface Options<T> {
  // e.g. 'plans' for /catalog/plans
  resource: string
  // singular, lower case, used in messages: 'plan'
  label: string
  // the PUT body that restores an archived item unchanged
  restoreBody: (item: T) => object
}

// List with a "show archived" switch, plus archive (DELETE) and restore (PUT active: true)
export function useCatalogList<T extends CatalogItem>({ resource, label, restoreBody }: Options<T>) {
  const api = useApi()
  const toast = useToast()

  const showArchived = ref(false)

  const { data, status, refresh } = useAsyncData(
    `admin-${resource}`,
    () =>
      api<{ data: T[] }>(`/catalog/${resource}`, { query: { archived: String(showArchived.value) } })
        .then((res) => res.data),
    { watch: [showArchived], default: () => [] as T[] },
  )

  const archiveTarget = ref<T | null>(null) as Ref<T | null>
  const archiveOpen = ref(false)
  const archiving = ref(false)

  function askArchive(item: T) {
    archiveTarget.value = item
    archiveOpen.value = true
  }

  async function confirmArchive() {
    const item = archiveTarget.value
    if (!item) return
    archiving.value = true
    try {
      await api(`/catalog/${resource}/${item.id}`, { method: 'DELETE' })
      toast.add({ title: `${item.name} archived`, color: 'success' })
      archiveOpen.value = false
      await refresh()
    } catch (err) {
      toast.add({ title: `Could not archive ${label}`, description: apiErrorMessage(err), color: 'error' })
    } finally {
      archiving.value = false
    }
  }

  async function restore(item: T) {
    try {
      await api(`/catalog/${resource}/${item.id}`, { method: 'PUT', body: { ...restoreBody(item), active: true } })
      toast.add({ title: `${item.name} restored`, color: 'success' })
      await refresh()
    } catch (err) {
      toast.add({ title: `Could not restore ${label}`, description: apiErrorMessage(err), color: 'error' })
    }
  }

  return { items: data, status, refresh, showArchived, archiveTarget, archiveOpen, archiving, askArchive, confirmArchive, restore }
}
