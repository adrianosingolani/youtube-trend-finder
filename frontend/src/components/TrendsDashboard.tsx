import { useQuery } from '@tanstack/react-query'
import { fetchTrendReports } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

const STALE_MS = 3_600_000

function formatReportDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

function sampleTitles(
  videos: ReadonlyArray<{ title: string }>,
  max: number,
): string {
  return videos
    .slice(0, max)
    .map((v) => v.title)
    .join(' · ')
}

export function TrendsDashboard() {
  const q = useQuery({
    queryKey: ['trendReports', { limit: 7, offset: 0 }],
    queryFn: () => fetchTrendReports({ limit: 7, offset: 0 }),
    staleTime: STALE_MS,
  })

  if (q.isPending) {
    return (
      <p className="text-muted-foreground font-mono text-sm">Loading trend reports…</p>
    )
  }

  if (q.isError) {
    return (
      <p className="text-destructive font-mono text-sm" role="alert">
        {q.error instanceof Error ? q.error.message : 'Could not load trends.'}
      </p>
    )
  }

  const reports = q.data
  if (reports.length === 0) {
    return (
      <p className="text-muted-foreground font-mono text-sm">
        No reports yet. Ingest video data via{' '}
        <code className="bg-muted px-1">POST /api/v1/ingest</code>.
      </p>
    )
  }

  return (
    <ScrollArea className="h-[min(70vh,720px)] pr-3">
      <ul className="flex flex-col gap-4 pb-4">
        {reports.map((report) => (
          <li key={report.id}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <CardTitle>{formatReportDate(report.analysisDate)}</CardTitle>
                  <Badge variant="outline">
                    {report.totalVideosAnalyzed} video
                    {report.totalVideosAnalyzed === 1 ? '' : 's'} analysed
                  </Badge>
                </div>
                <CardDescription>
                  {report.trends.length} trend
                  {report.trends.length === 1 ? '' : 's'} for this day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="flex list-decimal flex-col gap-3 pl-4">
                  {report.trends.map((trend, i) => (
                    <li key={`${report.id}-${i}`} className="text-sm">
                      <span className="font-medium text-foreground">{trend.topicName}</span>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {trend.explanation}
                      </p>
                      {trend.videos.length > 0 ? (
                        <p className="text-muted-foreground mt-2 font-mono text-xs">
                          <span className="text-foreground/80">Samples: </span>
                          {sampleTitles(trend.videos, 5)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </ScrollArea>
  )
}
