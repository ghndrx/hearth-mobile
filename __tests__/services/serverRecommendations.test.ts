/**
 * Tests for Server Recommendations Service
 */

import { serverRecommendations } from '../../lib/services/serverRecommendations';

describe('ServerRecommendationService', () => {
  describe('getCategories', () => {
    it('should return available interest categories', () => {
      const categories = serverRecommendations.getCategories();
      expect(categories).toContain('gaming');
      expect(categories).toContain('music');
      expect(categories).toContain('tech');
      expect(categories).toContain('art');
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('getSubcategories', () => {
    it('should return subcategories for a valid category', () => {
      const subs = serverRecommendations.getSubcategories('gaming');
      expect(subs.length).toBeGreaterThan(0);
      expect(subs).toContain('fps');
    });

    it('should return empty array for unknown category', () => {
      const subs = serverRecommendations.getSubcategories('nonexistent');
      expect(subs).toEqual([]);
    });
  });

  describe('getRecommendations', () => {
    it('should return popular servers when no interests given', () => {
      const recs = serverRecommendations.getRecommendations([]);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.length).toBeLessThanOrEqual(5);
      // Should be sorted by member count
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].memberCount).toBeGreaterThanOrEqual(recs[i].memberCount);
      }
    });

    it('should return relevant servers for given interests', () => {
      const recs = serverRecommendations.getRecommendations(['gaming']);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.category === 'gaming')).toBe(true);
    });

    it('should respect the limit parameter', () => {
      const recs = serverRecommendations.getRecommendations(['gaming'], 2);
      expect(recs.length).toBeLessThanOrEqual(2);
    });

    it('should handle multiple interests', () => {
      const recs = serverRecommendations.getRecommendations(['gaming', 'tech']);
      expect(recs.length).toBeGreaterThan(0);
    });
  });

  describe('getRecommendationsByCategory', () => {
    it('should return servers matching categories', () => {
      const recs = serverRecommendations.getRecommendationsByCategory(['tech']);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.every(r => r.category === 'tech')).toBe(true);
    });

    it('should return empty array for unmatched categories', () => {
      const recs = serverRecommendations.getRecommendationsByCategory(['nonexistent']);
      expect(recs).toEqual([]);
    });

    it('should respect the limit parameter', () => {
      const recs = serverRecommendations.getRecommendationsByCategory(['gaming', 'tech'], 1);
      expect(recs.length).toBeLessThanOrEqual(1);
    });
  });
});
