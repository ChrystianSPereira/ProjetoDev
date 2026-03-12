import { AppShell } from '../components/layout/AppShell'

const METRICS = [
  { label: 'Documentos vigentes', value: '128', delta: '+6%' },
  { label: 'Em revisao', value: '14', delta: '-2%' },
  { label: 'Aguardando aprovacao', value: '9', delta: '+12%' },
]

export function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Painel inicial da plataforma de gestao documental."
    >
      {({ palette }) => (
        <div className="grid gap-4 md:grid-cols-3">
          {METRICS.map((metric) => (
            <article key={metric.label} className={`rounded-2xl border p-5 ${palette.panel}`}>
              <p className={`text-sm ${palette.textSecondary}`}>{metric.label}</p>
              <p className="mt-2 text-3xl font-bold">{metric.value}</p>
              <p className="mt-2 text-xs text-emerald-500">{metric.delta} no ultimo periodo</p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  )
}
