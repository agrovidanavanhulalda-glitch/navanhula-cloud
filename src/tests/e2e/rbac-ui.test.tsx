import { describe, it, expect } from 'vitest';
import { canAccessRoute, getDefaultRouteForRole } from '@/lib/roleRoutes';
import type { AppRole } from '@/types/pos';

describe('RBAC Routing and Logic Tests', () => {
  describe('canAccessRoute logic', () => {
    it('Seller: should be restricted from admin/manager routes', () => {
      const sellerRole: AppRole = 'seller';
      
      // Allowed
      expect(canAccessRoute('/app/pdv', sellerRole)).toBe(true);
      expect(canAccessRoute('/app/vendas', sellerRole)).toBe(true);
      
      // Restricted (requires manager/admin)
      expect(canAccessRoute('/app/configuracoes', sellerRole)).toBe(false);
      expect(canAccessRoute('/app/lojas', sellerRole)).toBe(false);
      expect(canAccessRoute('/app/compliance', sellerRole)).toBe(false);
      expect(canAccessRoute('/app/bi', sellerRole)).toBe(false);
    });

    it('Manager: should access inventory and settings, but restricted from CEO/Compliance', () => {
      const managerRole: AppRole = 'manager';
      
      // Allowed
      expect(canAccessRoute('/app/estoque', managerRole)).toBe(true);
      expect(canAccessRoute('/app/configuracoes', managerRole)).toBe(true);
      expect(canAccessRoute('/app/dashboard/gestor', managerRole)).toBe(true);
      
      // Restricted
      expect(canAccessRoute('/app/ceo', managerRole)).toBe(false);
      expect(canAccessRoute('/app/compliance', managerRole)).toBe(false);
      expect(canAccessRoute('/app/auditoria', managerRole)).toBe(false);
    });

    it('Admin/CEO: should have access to everything', () => {
      const adminRole: AppRole = 'admin';
      const ceoRole: AppRole = 'ceo';
      
      const allRoutes = [
        '/app/pdv',
        '/app/configuracoes',
        '/app/ceo',
        '/app/compliance',
        '/app/auditoria',
        '/app/bi'
      ];
      
      allRoutes.forEach(route => {
        expect(canAccessRoute(route, adminRole)).toBe(true);
        expect(canAccessRoute(route, ceoRole)).toBe(true);
      });
    });
  });

  describe('getDefaultRouteForRole logic', () => {
    it('should return correct landing page for each role', () => {
      expect(getDefaultRouteForRole('seller')).toBe('/app/pdv');
      expect(getDefaultRouteForRole('manager')).toBe('/app/dashboard/gestor');
      expect(getDefaultRouteForRole('admin')).toBe('/app/dashboard');
      expect(getDefaultRouteForRole('ceo')).toBe('/app/ceo');
    });
  });
});
