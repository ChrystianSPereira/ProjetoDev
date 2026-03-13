import { DocumentScopeBadge } from './DocumentScopeBadge'
import { DocumentStatusBadge } from './DocumentStatusBadge'

export function DocumentsTable({ rows, loading, isDark, textSecondaryClass, renderActions }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className={textSecondaryClass}>
            <th className="px-2.5 py-2 font-semibold">Titulo</th>
            <th className="px-2.5 py-2 font-semibold">Setor</th>
            <th className="px-2.5 py-2 font-semibold">Tipo documental</th>
            <th className="px-2.5 py-2 font-semibold">Abrangencia</th>
            <th className="px-2.5 py-2 font-semibold">Versao</th>
            <th className="px-2.5 py-2 font-semibold">Status</th>
            <th className="px-2.5 py-2 font-semibold">Vencimento</th>
            <th className="px-2.5 py-2 font-semibold">Criado por</th>
            <th className="px-2.5 py-2 font-semibold">Aprovado por</th>
            <th className="px-2.5 py-2 font-semibold">Atualizado em</th>
            <th className="px-2.5 py-2 font-semibold">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.document_id}-${row.version_id}`} className="border-t border-slate-700/20">
              <td className="px-2.5 py-2">
                <p className="font-semibold">{row.title}</p>
                <p className={textSecondaryClass}>{row.code}</p>
              </td>
              <td className="px-2.5 py-2">{row.sector_name}</td>
              <td className="px-2.5 py-2">{row.document_type_name}</td>
              <td className="px-2.5 py-2"><DocumentScopeBadge scope={row.scope} isDark={isDark} /></td>
              <td className="px-2.5 py-2">v{row.version_number}</td>
              <td className="px-2.5 py-2"><DocumentStatusBadge status={row.status} isDark={isDark} /></td>
              <td className="px-2.5 py-2">{row.expiration_date}</td>
              <td className="px-2.5 py-2">{row.created_by_name}</td>
              <td className="px-2.5 py-2">{row.approved_by_name || '-'}</td>
              <td className="px-2.5 py-2">{new Date(row.updated_at).toLocaleString('pt-BR')}</td>
              <td className="px-2.5 py-2">{renderActions(row)}</td>
            </tr>
          ))}

          {!loading && rows.length === 0 ? (
            <tr>
              <td className={`px-2.5 py-6 text-center ${textSecondaryClass}`} colSpan={11}>
                Nenhum documento encontrado para os filtros aplicados.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
