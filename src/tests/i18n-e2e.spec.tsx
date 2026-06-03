import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n } from '@/contexts/i18n';
import LanguageSelector from '@/components/layout/LanguageSelector';

// Mock total do LanguageSelector para simplificar o teste E2E
// O objetivo é testar o fluxo I18nProvider -> useI18n -> Tradução instantânea
vi.mock("@/components/layout/LanguageSelector", () => ({
  default: () => {
    const { setLanguage } = useI18n();
    return (
      <div>
        <button data-testid="lang-btn-pt" onClick={() => setLanguage('pt')}>PT</button>
        <button data-testid="lang-btn-en" onClick={() => setLanguage('en')}>EN</button>
        <button data-testid="lang-btn-es" onClick={() => setLanguage('es')}>ES</button>
        <button data-testid="lang-btn-fr" onClick={() => setLanguage('fr')}>FR</button>
        <button data-testid="lang-btn-de" onClick={() => setLanguage('de')}>DE</button>
      </div>
    );
  }
}));

// Componente de teste para exibir textos traduzidos
const TestComponent = () => {
  const { t } = useI18n();
  return (
    <div>
      <h1 data-testid="settings-title">{t('settings.title')}</h1>
      <button data-testid="save-btn">{t('common.save')}</button>
      <div data-testid="system-tab">{t('settings.tabs.sistema')}</div>
      <div data-testid="currency-label">{t('settings.system.currency')}</div>
    </div>
  );
};

describe('I18n End-to-End Language Switching', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock navigator.language
    Object.defineProperty(window.navigator, 'language', {
      value: 'pt-BR',
      configurable: true
    });
  });

  it('should switch language and update all texts instantly', async () => {
    render(
      <I18nProvider>
        <LanguageSelector />
        <TestComponent />
      </I18nProvider>
    );

    // Initial state (PT)
    expect(screen.getByTestId('settings-title')).toHaveTextContent('Configurações');
    expect(screen.getByTestId('save-btn')).toHaveTextContent('Salvar');

    // Helper to change language via selector
    const changeLang = (code: string) => {
      const btn = screen.getByTestId(`lang-btn-${code}`);
      fireEvent.click(btn);
    };

    // Switch to EN
    changeLang('en');
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Save');
    });

    // Switch to ES
    changeLang('es');
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Configuración');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Guardar');
    });

    // Switch to FR
    changeLang('fr');
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Paramètres');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Enregistrer');
    });

    // Switch to DE
    changeLang('de');
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Einstellungen');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Speichern');
    });

    // Verify system settings keys specifically (Informações Gerais do Sistema)
    expect(screen.getByTestId('system-tab')).toHaveTextContent('System');
    expect(screen.getByTestId('currency-label')).toHaveTextContent('Währung');
  });

  it('should persist language choice in localStorage', async () => {
    const { unmount } = render(
      <I18nProvider>
        <LanguageSelector />
        <TestComponent />
      </I18nProvider>
    );

    const btn = screen.getByTestId('lang-btn-en');
    fireEvent.click(btn);

    expect(localStorage.getItem('navanhula_lang')).toBe('en');

    unmount();

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
  });
});
