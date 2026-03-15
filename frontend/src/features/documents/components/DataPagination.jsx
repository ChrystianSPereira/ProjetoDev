export function DataPagination({ page, totalPages, onPrev, onNext, textSecondaryClass, buttonClass }) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <p className={`text-xs ${textSecondaryClass}`}>Página {page} de {totalPages}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Proxima
        </button>
      </div>
    </div>
  )
}

