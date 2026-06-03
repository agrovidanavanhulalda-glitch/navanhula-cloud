import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n } from '@/contexts/i18n';

// Componente de teste para exibir textos traduzidos
const TestComponent = () => {
  const { t, setLanguage } = useI18n();
  return (
    <div>
      <h1 data-testid="settings-title">{t('settings.title')}</h1>
      <button data-testid="save-btn">{t('common.save')}</button>
      <div data-testid="system-tab">{t('settings.tabs.sistema')}</div>
      <div data-testid="currency-label">{t('settings.system.currency')}</div>
      
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
  });

  it('should switch language and update all texts instantly via context', async () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    // PT (Padrão)
    expect(screen.getByTestId('settings-title')).toHaveTextContent('Configurações');
    expect(screen.getByTestId('save-btn')).toHaveTextContent('Salvar');

    // Mudar para EN
    fireEvent.click(screen.getByTestId('btn-en'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Save');
    });

    // Mudar para ES
    fireEvent.click(screen.getByTestId('btn-es'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Configuración');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Guardar');
    });

    // Mudar para FR
    fireEvent.click(screen.getByTestId('btn-fr'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Paramètres');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Enregistrer');
    });

    // Mudar para DE
    fireEvent.click(screen.getByTestId('btn-de'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-title')).toHaveTextContent('Einstellungen');
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Speichern');
    });

    // Validar chaves de Informações Gerais do Sistema em DE
    expect(screen.getByTestId('system-tab')).toHaveTextContent('System');
    expect(screen.getByTestId('currency-label')).toHaveTextContent('Währung');
  });

  it('should persist and recover language from localStorage', () => {
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

    expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
  });
});
