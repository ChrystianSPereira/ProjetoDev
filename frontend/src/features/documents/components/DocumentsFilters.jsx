export function DocumentsFilters({
  filters,
  sectors,
  documentTypes,
  inputClass,
  selectClass,
  onChange,
  onSubmit,
  onClear,
  statusOptions = [
    { value: '', label: 'Status (com foco em vigente)' },
    { value: 'DRAFT', label: 'Rascunho' },
    { value: 'IN_REVIEW', label: 'Em Revisao' },
    { value: 'ACTIVE', label: 'Vigente' },
    { value: 'OBSOLETE', label: 'Obsoleto' },
  ],
  statusDisabled = false,
}) {
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
        className="h-10 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
      >
        Limpar
      </button>

      <button
        type="submit"
        className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700"
      >
        Buscar
      </button>
    </form>
  )
}
