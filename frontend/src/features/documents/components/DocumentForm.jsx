import { useId, useMemo, useRef, useState } from 'react'

function validate(values) {
  const errors = {}

  if (!values.title.trim()) errors.title = 'Titulo obrigatorio.'
  if (!values.code.trim()) errors.code = 'Codigo obrigatorio.'
  if (!values.sectorId) errors.sectorId = 'Selecione o setor.'
  if (!values.documentTypeId) errors.documentTypeId = 'Selecione o tipo documental.'
  if (!values.expirationDate) errors.expirationDate = 'Informe a data de vencimento.'
  if (!values.fileName.trim()) errors.fileName = 'Selecione um arquivo para upload.'

  return errors
}

function ensureFullWidthClass(baseClass) {
  return baseClass.includes('w-full') ? baseClass : `${baseClass} w-full`
}

export function DocumentForm({
  initialValues,
  sectors,
  documentTypes,
  inputClass,
  selectClass,
  onSaveDraft,
  onSubmitReview,
  disabled,
  disabledReason = '',
  isDark = true,
}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [dragActive, setDragActive] = useState(false)

  const fileInputId = useId()
  const fileInputRef = useRef(null)

  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors])

  const normalizedInputClass = useMemo(() => ensureFullWidthClass(inputClass), [inputClass])
  const normalizedSelectClass = useMemo(() => ensureFullWidthClass(selectClass), [selectClass])

  const labelClass = isDark
    ? 'mb-1.5 block text-[11px] font-semibold tracking-[0.03em] text-slate-300 uppercase'
    : 'mb-1.5 block text-[11px] font-semibold tracking-[0.03em] text-slate-600 uppercase'

  const hintClass = isDark ? 'text-[11px] text-slate-400' : 'text-[11px] text-slate-500'

  const uploadCardClass = dragActive
    ? isDark
      ? 'rounded-2xl border border-dashed border-cyan-400 bg-cyan-500/10 p-4 transition'
      : 'rounded-2xl border border-dashed border-cyan-500 bg-cyan-50 p-4 transition'
    : isDark
      ? 'rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-4 transition'
      : 'rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition'

  const uploadButtonClass = isDark
    ? 'h-9 rounded-xl border border-slate-600 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800'
    : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100'

  const secondaryActionClass = isDark
    ? 'h-10 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
    : 'h-10 rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60'

  function setField(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => {
      if (!(key in previous)) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  function applyFile(file) {
    if (disabled) return
    if (!file) return
    setField('fileName', file.name)
    setField('fileUri', `/uploads/${file.name}`)
  }

  function runValidation() {
    const currentErrors = validate(values)
    setErrors(currentErrors)
    return Object.keys(currentErrors).length === 0
  }

  function buildPayload() {
    return {
      title: values.title.trim(),
      code: values.code.trim(),
      scope: values.scope,
      sector_id: Number(values.sectorId),
      document_type_id: Number(values.documentTypeId),
      expiration_date: values.expirationDate,
      file_uri: values.fileUri.trim() || `/uploads/${values.fileName.trim()}`,
    }
  }

  function handleDragOver(event) {
    if (disabled) return
    event.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(event) {
    if (disabled) return
    event.preventDefault()
    setDragActive(false)
  }

  function handleDrop(event) {
    if (disabled) return
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer?.files?.[0]
    applyFile(file)
  }

  async function handleSaveDraft(event) {
    event.preventDefault()
    if (disabled) return
    if (!runValidation()) return
    await onSaveDraft(buildPayload())
  }

  async function handleSubmitReview(event) {
    event.preventDefault()
    if (disabled) return
    if (!runValidation()) return
    await onSubmitReview(buildPayload())
  }

  return (
    <form className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="doc-title" className={labelClass}>Titulo</label>
          <input
            id="doc-title"
            className={normalizedInputClass}
            value={values.title}
            onChange={(event) => setField('title', event.target.value)}
            placeholder="Ex: POP Limpeza Hospitalar"
            disabled={disabled}
          />
          {errors.title ? <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p> : null}
        </div>

        <div>
          <label htmlFor="doc-code" className={labelClass}>Codigo</label>
          <input
            id="doc-code"
            className={normalizedInputClass}
            value={values.code}
            onChange={(event) => setField('code', event.target.value)}
            placeholder="Ex: POP-001"
            disabled={disabled}
          />
          {errors.code ? <p className="mt-1 text-[11px] text-rose-500">{errors.code}</p> : null}
        </div>

        <div>
          <label htmlFor="doc-scope" className={labelClass}>Abrangencia</label>
          <select
            id="doc-scope"
            className={normalizedSelectClass}
            value={values.scope}
            onChange={(event) => setField('scope', event.target.value)}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
            disabled={disabled}
          >
            <option value="LOCAL">Local (setor)</option>
            <option value="CORPORATE">Corporativo</option>
          </select>
        </div>

        <div>
          <label htmlFor="doc-sector" className={labelClass}>Setor</label>
          <select
            id="doc-sector"
            className={normalizedSelectClass}
            value={values.sectorId}
            onChange={(event) => setField('sectorId', event.target.value)}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
            disabled={disabled}
          >
            <option value="">Selecione o setor</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
          {errors.sectorId ? <p className="mt-1 text-[11px] text-rose-500">{errors.sectorId}</p> : null}
        </div>

        <div>
          <label htmlFor="doc-type" className={labelClass}>Tipo documental</label>
          <select
            id="doc-type"
            className={normalizedSelectClass}
            value={values.documentTypeId}
            onChange={(event) => setField('documentTypeId', event.target.value)}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
            disabled={disabled}
          >
            <option value="">Selecione o tipo documental</option>
            {documentTypes.map((documentType) => (
              <option key={documentType.id} value={documentType.id}>
                {documentType.name}
              </option>
            ))}
          </select>
          {errors.documentTypeId ? <p className="mt-1 text-[11px] text-rose-500">{errors.documentTypeId}</p> : null}
        </div>

        <div>
          <label htmlFor="doc-expiration" className={labelClass}>Data de vencimento</label>
          <input
            id="doc-expiration"
            type="date"
            className={normalizedInputClass}
            value={values.expirationDate}
            onChange={(event) => setField('expirationDate', event.target.value)}
            disabled={disabled}
          />
          {errors.expirationDate ? <p className="mt-1 text-[11px] text-rose-500">{errors.expirationDate}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Arquivo</label>
          <div
            className={`${uploadCardClass} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-disabled={disabled}
          >
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => applyFile(event.target.files?.[0])}
              disabled={disabled}
            />

            <div className="flex flex-col items-center justify-center gap-2 py-2 text-center">
              <p className={isDark ? 'text-sm font-semibold text-slate-200' : 'text-sm font-semibold text-slate-700'}>
                Arraste e solte o arquivo aqui
              </p>
              <p className={hintClass}>ou</p>
              <button
                type="button"
                onClick={() => {
                  if (disabled) return
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                    fileInputRef.current.click()
                  }
                }}
                className={uploadButtonClass}
                disabled={disabled}
              >
                Selecionar arquivo
              </button>
              <p className={`${hintClass} max-w-xl`}>
                O backend registra a URI do arquivo no MVP.
              </p>
            </div>
          </div>

          <p className={`mt-2 ${hintClass}`}>
            Arquivo selecionado: <span className="font-semibold">{values.fileName || 'nenhum'}</span>
          </p>
          {errors.fileName ? <p className="mt-1 text-[11px] text-rose-500">{errors.fileName}</p> : null}
        </div>
      </div>

      {disabledReason ? <p className="text-[11px] text-amber-400">{disabledReason}</p> : null}
      {!disabled && hasErrors ? <p className="text-[11px] text-rose-500">Corrija os campos destacados para continuar.</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={disabled}
          className={secondaryActionClass}
        >
          Salvar rascunho
        </button>

        <button
          type="button"
          onClick={handleSubmitReview}
          disabled={disabled}
          className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Salvar e submeter para revisao
        </button>
      </div>
    </form>
  )
}
