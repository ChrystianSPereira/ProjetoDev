export function DocumentsFilters({
  filters,
  sectors,
  documentTypes,
  inputClass,
  selectClass,
  isDark = false,
  onChange,
  onSubmit,
  onClear,
  statusOptions = [
    { value: '', label: 'Status (com foco em vigente)' },
    { value: 'DRAFT', label: 'Rascunho' },
    { value: 'IN_REVIEW', label: 'Em Revisão' },
    { value: 'ACTIVE', label: 'Vigente' },
    { value: 'OBSOLETE', label: 'Obsoleto' },
  ],
  statusDisabled = false,
}) {
  const clearButtonClass = isDark
    ? 'h-10 rounded-xl border border-slate-600 bg-slate-900 px-4 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60'
    : 'h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60'

  const searchButtonClass = isDark
    ? 'h-10 rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60'
    : 'h-10 rounded-xl border border-emerald-500/30 bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60'

  return (
    <form className="grid gap-2 md:grid-cols-[1fr_190px_190px_170px_170px_auto_auto]" onSubmit={onSubmit}>
      <input
        value={filters.q}
        onChange={(event) => onChange('q', event.target.value)}
        className={inputClass}
        placeholder="Buscar por titulo ou codigo"
      />

      <select
        value={filters.sectorId}
        onChange={(event) => onChange('sectorId', event.target.value)}
        className={selectClass}
      >
        <option value="">Todos setores</option>
        {sectors.map((sector) => (
          <option key={sector.id} value={sector.id}>
            {sector.name}
          </option>
        ))}
      </select>

      <select
        value={filters.documentTypeId}
        onChange={(event) => onChange('documentTypeId', event.target.value)}
        className={selectClass}
      >
        <option value="">Todos tipos</option>
        {documentTypes.map((documentType) => (
          <option key={documentType.id} value={documentType.id}>
            {documentType.name}
          </option>
        ))}
      </select>

      <select
        value={filters.scope}
        onChange={(event) => onChange('scope', event.target.value)}
        className={selectClass}
      >
        <option value="">Todas abrangencias</option>
        <option value="CORPORATE">Corporativo</option>
        <option value="LOCAL">Local</option>
      </select>

      <select
        value={filters.status}
        onChange={(event) => onChange('status', event.target.value)}
        className={selectClass}
        disabled={statusDisabled}
      >
        {statusOptions.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onClear}
        className={clearButtonClass}
      >
        Limpar
      </button>

      <button
        type="submit"
        className={searchButtonClass}
      >
        Buscar
      </button>
    </form>
  )
}

