import './App.css'
import { TrendsDashboard } from '@/components/TrendsDashboard'

export default function App() {
  return (
    <div className="text-foreground w-full max-w-3xl px-4 py-8 text-left">
      <header className="mb-8">
        <h1 className="text-foreground mb-2 font-mono text-2xl font-medium tracking-tight">
          YouTube trend reports
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">
          Daily AI-derived themes from ingested videos. Data refreshes at most once per hour in the
          UI.
        </p>
      </header>
      <TrendsDashboard />
    </div>
  )
}
