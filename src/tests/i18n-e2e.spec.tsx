import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n } from '@/contexts/i18n';
import LanguageSelector from '@/components/layout/LanguageSelector';
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

// Mock do DropdownMenu para evitar problemas com Portals no JSDOM
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-root">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, 'data-testid': testId }: any) => (
    <div data-testid={testId} onClick={onClick}>
      {children}
    </div>
  ),
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
      const trigger = screen.getByTestId('language-selector-trigger');
      fireEvent.click(trigger);
      const option = screen.getByTestId(`lang-option-${code}`);
      fireEvent.click(option);
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

    const trigger = screen.getByTestId('language-selector-trigger');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('lang-option-en'));

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
