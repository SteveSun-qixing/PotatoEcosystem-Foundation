import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME_ID, ThemeEngine } from './theme-engine';

describe('ThemeEngine', () => {
  it('uses stage10 default theme id', () => {
    const engine = new ThemeEngine();
    const defaultTheme = engine.createDefaultTheme();

    expect(defaultTheme.themeId).toBe(DEFAULT_THEME_ID);
    expect(defaultTheme.id).toBe(DEFAULT_THEME_ID);
  });

  it('resolves full six-layer hierarchy with component priority', () => {
    const engine = new ThemeEngine();

    const register = (themeId: string): void => {
      engine.registerTheme({
        themeId,
        id: themeId,
        name: themeId,
        version: '1.0.0',
        type: 'light',
        cssVariables: {},
        cssContent: '',
        componentStyles: {},
      });
    };

    register('global.theme');
    register('app.theme');
    register('box.theme');
    register('composite.theme');
    register('base-card.theme');
    register('component.theme');

    const resolved = engine.resolveThemeHierarchy({
      global: 'global.theme',
      app: 'app.theme',
      box: 'box.theme',
      compositeCard: 'composite.theme',
      baseCard: 'base-card.theme',
      component: 'component.theme',
    });

    expect(resolved?.themeId).toBe('component.theme');
  });

  it('supports host route alias card in hierarchy chain', () => {
    const engine = new ThemeEngine();
    engine.registerTheme({
      themeId: 'legacy-card.theme',
      id: 'legacy-card.theme',
      name: 'legacy',
      version: '1.0.0',
      type: 'light',
      cssVariables: {},
      cssContent: '',
      componentStyles: {},
    });

    const resolved = engine.resolveThemeHierarchy({
      card: 'legacy-card.theme',
      global: 'global.theme',
    });

    expect(resolved?.themeId).toBe('legacy-card.theme');
  });
});
