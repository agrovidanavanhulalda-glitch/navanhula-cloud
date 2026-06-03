import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n } from '@/contexts/i18n';

// Mock do Supabase para evitar chamadas reais e efeitos colaterais
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }),
  },
}));

// Componente de teste para exibir textos traduzidos
const TestComponent = () => {
  const { t, setLanguage, language } = useI18n();
  return (
    <div>
      <h1 data-testid="settings-title">{t('settings.title')}</h1>
      <button data-testid="save-btn">{t('common.save')}</button>
      <div data-testid="system-tab">{t('settings.tabs.sistema')}</div>
      <div data-testid="currency-label">{t('settings.system.currency')}</div>
      <div data-testid="current-lang">{language}</div>
      
      <button data-testid="btn-pt" onClick={() => setLanguage('pt')}>PT</button>
      <button data-testid="btn-en" onClick={() => setLanguage('en')}>EN</button>
      <button data-testid="btn-es" onClick={() => setLanguage('es')}>ES</button>
      <button data-testid="btn-fr" onClick={() => setLanguage('fr')}>FR</button>
      <button data-testid="btn-de" onClick={() => setLanguage('de')}>DE</button>
    </div>
  );
};

describe('I18n End-to-End Core Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should switch language and update all texts instantly via context', async () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    // Initial state (Detected or default PT)
    // Se o browser do JSDOM for pt, vai ser pt. Se não, pt.
    
    // Mudar para EN
    fireEvent.click(screen.getByTestId('btn-en'));
    await waitFor(() => {
      expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
      // No i18n.tsx, 'settings.title' existe em PT e EN.
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
    }, { timeout: 2000 });

    // Mudar para PT
    fireEvent.click(screen.getByTestId('btn-pt'));
    await waitFor(() => {
      expect(screen.getByTestId('current-lang')).toHaveTextContent('pt');
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Configurações');
    }, { timeout: 2000 });

    // Mudar para ES
    // Nota: Como 'settings.title' NÃO está no bloco 'es', ele deve cair no fallback (PT ou EN)
    fireEvent.click(screen.getByTestId('btn-es'));
    await waitFor(() => {
      expect(screen.getByTestId('current-lang')).toHaveTextContent('es');
      // 'common.save' existe no bloco 'es' como 'Guardar'
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Guardar');
    }, { timeout: 2000 });

    // Mudar para FR
    fireEvent.click(screen.getByTestId('btn-fr'));
    await waitFor(() => {
      expect(screen.getByTestId('current-lang')).toHaveTextContent('fr');
      // 'common.save' existe no bloco 'fr' como 'Enregistrer'
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Enregistrer');
    }, { timeout: 2000 });

    // Mudar para DE
    fireEvent.click(screen.getByTestId('btn-de'));
    await waitFor(() => {
      expect(screen.getByTestId('current-lang')).toHaveTextContent('de');
      // 'common.save' existe no bloco 'de' como 'Speichern'
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Speichern');
    }, { timeout: 2000 });

    // Validar chaves de Informações Gerais do Sistema em DE
    // 'nav.settings' existe em todos
    // 'common.save' existe em todos
  });

  it('should persist and recover language from localStorage', async () => {
    const { unmount } = render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('btn-en'));
    expect(localStorage.getItem('navanhula_lang')).toBe('en');

    unmount();

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
        expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
    });
  });
});
