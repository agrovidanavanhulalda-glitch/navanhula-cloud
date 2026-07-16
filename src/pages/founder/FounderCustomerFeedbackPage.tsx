/**
 * Sprint 7.2 · Founder Customer Feedback Center (read-only, deterministic).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, Sparkles, Heart, TrendingUp, ThumbsUp, ThumbsDown, Minus,
  AlertTriangle, Trophy, Lightbulb, BarChart3,
} from 'lucide-react';
import {
  assessFeedbackPortfolio,
  type FeedbackPortfolio,
} from '@/lib/agentic/customer-feedback/customerFeedbackAggregator';
import type { FeedbackEntry } from '@/lib/agentic/customer-feedback/types';

const SEED: FeedbackEntry[] = [
  { id: 'f1', customerId: 'c1', customerName: 'Padaria Central', rating: 10, category: 'usability', comment: 'Sistema excelente, muito fácil de usar', createdAt: '2026-05-08' },
  { id: 'f2', customerId: 'c1', customerName: 'Padaria Central', rating: 9,  category: 'features',  comment: 'Adoro o módulo fiscal', createdAt: '2026-06-12' },
  { id: 'f3', customerId: 'c2', customerName: 'Agro Zambézia',  rating: 4,  category: 'performance', comment: 'App lento em horário de pico', createdAt: '2026-06-20' },
  { id: 'f4', customerId: 'c2', customerName: 'Agro Zambézia',  rating: 3,  category: 'support',    comment: 'Suporte demora a responder', createdAt: '2026-07-02' },
  { id: 'f5', customerId: 'c3', customerName: 'Retail Norte',   rating: 10, category: 'reliability', comment: 'Nunca falhou, recomendo', createdAt: '2026-07-05' },
  { id: 'f6', customerId: 'c4', customerName: 'Avícola Beira',  rating: 6,  category: 'pricing',    comment: 'Preço um pouco caro', createdAt: '2026-07-10' },
  { id: 'f7', customerId: 'c5', customerName: 'Mercearia N.',   rating: 8,  category: 'onboarding', comment: '', createdAt: '2026-07-11' },
  { id: 'f8', customerId: 'c3', customerName: 'Retail Norte',   rating: 9,  category: 'features',   comment: 'Ótimo', createdAt: '2026-07-14' },
];

const ratingTone = (r: string) =>
  r === 'CHAMPION' || r === 'HEALTHY' ? 'bg-success/15 text-success border-success/30'
  : r === 'STABLE' ? 'bg-muted text-muted-foreground border-border'
  : r === 'AT_RISK' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-destructive/15 text-destructive border-destructive/30';

const prioTone = (p: string) =>
  p === 'P1' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : p === 'P2' ? 'bg-warning/15 text-warning border-warning/30'
  : 'bg-muted text-muted-foreground border-border';

export const FounderCustomerFeedbackPage: React.FC = () => {
  const portfolio: FeedbackPortfolio = React.useMemo(() => assessFeedbackPortfolio(SEED), []);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Customer Feedback Intelligence</h1>
            <p className="text-xs text-muted-foreground">
              NPS, satisfação, sentimento e voz do cliente. Consultivo, read-only.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Sparkles className="h-4 w-4" />} label="Feedback Score" value={`${portfolio.score.score}/100`} tone="success" />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="NPS" value={`${portfolio.nps.nps}`} />
        <Kpi icon={<BarChart3 className="h-4 w-4" />} label="CSAT" value={`${portfolio.satisfaction.csat}/100`} />
        <Kpi icon={<Heart className="h-4 w-4" />} label="Loyalty" value={`${portfolio.loyalty.score}/100`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={<ThumbsUp className="h-4 w-4" />} label="Promoters" value={`${portfolio.nps.promoters} (${portfolio.nps.promoterPct}%)`} tone="success" />
        <Kpi icon={<Minus className="h-4 w-4" />} label="Passives" value={`${portfolio.nps.passives} (${portfolio.nps.passivePct}%)`} />
        <Kpi icon={<ThumbsDown className="h-4 w-4" />} label="Detractors" value={`${portfolio.nps.detractors} (${portfolio.nps.detractorPct}%)`} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${ratingTone(portfolio.summary.rating)} text-[10px]`}>
              {portfolio.summary.rating}
            </Badge>
            <span className="text-sm font-medium">{portfolio.summary.headline}</span>
          </div>
          <p className="text-xs text-muted-foreground">➜ {portfolio.summary.nextAction}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Feedback por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {portfolio.categories.map((c) => (
              <div key={c.category} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div className="text-xs">
                  <div className="font-semibold capitalize">{c.category}</div>
                  <div className="text-muted-foreground">{c.count} feedback(s) · {c.sharePct}%</div>
                </div>
                <span className="text-sm font-mono">{c.avgRating}/10</span>
              </div>
            ))}
            {portfolio.categories.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem dados de categoria.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Tendência Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {portfolio.trend.map((t) => (
              <div key={t.month} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div className="text-xs">
                  <div className="font-semibold">{t.month}</div>
                  <div className="text-muted-foreground">{t.count} respostas · avg {t.avgRating}/10</div>
                </div>
                <Badge variant="outline" className="text-[10px]">NPS {t.nps}</Badge>
              </div>
            ))}
            {portfolio.trend.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem histórico.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-success" /> Principais Elogios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {portfolio.voice.topPraises.map((v) => (
              <div key={v.id} className="rounded-lg border border-success/30 bg-success/5 px-3 py-2">
                <div className="text-xs font-semibold">{v.customerName ?? v.id} · {v.rating}/10</div>
                <div className="text-xs text-muted-foreground italic">"{v.comment}"</div>
              </div>
            ))}
            {portfolio.voice.topPraises.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum elogio registado.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Principais Reclamações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {portfolio.voice.topComplaints.map((v) => (
              <div key={v.id} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="text-xs font-semibold">{v.customerName ?? v.id} · {v.rating}/10</div>
                <div className="text-xs text-muted-foreground italic">"{v.comment}"</div>
              </div>
            ))}
            {portfolio.voice.topComplaints.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma reclamação registada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Oportunidades Prioritárias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {portfolio.opportunities.map((o) => (
            <div key={o.category} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div className="text-xs">
                <div className="font-semibold capitalize">{o.category}</div>
                <div className="text-muted-foreground">{o.rationale}</div>
              </div>
              <Badge variant="outline" className={`${prioTone(o.priority)} text-[10px]`}>{o.priority}</Badge>
            </div>
          ))}
          {portfolio.opportunities.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma oportunidade crítica.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        Sprint 7.2 · Customer Feedback — consultivo, read-only, sem alterações em módulos protegidos.
      </p>
    </div>
  );
};

const Kpi: React.FC<{
  icon: React.ReactNode; label: string; value: string; tone?: 'success' | 'warning';
}> = ({ icon, label, value, tone }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        {icon}<span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${
        tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-foreground'
      }`}>{value}</div>
    </CardContent>
  </Card>
);

export default FounderCustomerFeedbackPage;
