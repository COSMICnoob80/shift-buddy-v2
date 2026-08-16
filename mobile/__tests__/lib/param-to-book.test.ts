import { getBookRefs, hasBookContent } from '../../lib/param-to-book';

describe('param-to-book', () => {
  describe('getBookRefs', () => {
    it('returns hyperkalemia refs for K+', () => {
      const refs = getBookRefs('K_');
      expect(refs.length).toBeGreaterThanOrEqual(2);
      expect(refs[0].label).toContain('Hyperkalemia');
      expect(refs[0].sectionId).toBeTruthy();
    });

    it('returns DKA + hypoglycemia refs for blood_sugar', () => {
      const refs = getBookRefs('blood_sugar');
      expect(refs.length).toBeGreaterThanOrEqual(2);
      const labels = refs.map((r) => r.label);
      expect(labels.some((l) => l.includes('DKA'))).toBe(true);
    });

    it('returns cardiac + shock refs for heart_rate', () => {
      const refs = getBookRefs('heart_rate');
      expect(refs.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty for unknown param', () => {
      const refs = getBookRefs('nonexistent_param');
      expect(refs).toEqual([]);
    });

    it('returns AKI & GI refs for creatinine', () => {
      const refs = getBookRefs('creatinine');
      expect(refs.length).toBeGreaterThanOrEqual(1);
    });

    it('returns anemic refs for hemoglobin', () => {
      const refs = getBookRefs('hemoglobin');
      expect(refs.length).toBeGreaterThanOrEqual(3);
    });

    it('returns thrombocytopenic refs for platelets', () => {
      const refs = getBookRefs('platelets');
      expect(refs.length).toBeGreaterThanOrEqual(2);
    });

    it('returns ACS refs for troponin', () => {
      const refs = getBookRefs('troponin');
      expect(refs.some((r) => r.label.includes('ACS') || r.label.includes('Chest'))).toBe(true);
    });

    it('returns shock refs for lactate', () => {
      const refs = getBookRefs('lactate');
      expect(refs.some((r) => r.label.includes('Shock'))).toBe(true);
    });
  });

  describe('hasBookContent', () => {
    it('returns true for known params', () => {
      expect(hasBookContent('K_')).toBe(true);
      expect(hasBookContent('blood_sugar')).toBe(true);
      expect(hasBookContent('creatinine')).toBe(true);
      expect(hasBookContent('heart_rate')).toBe(true);
    });

    it('returns false for unknown params', () => {
      expect(hasBookContent('unknown_thing')).toBe(false);
      expect(hasBookContent('')).toBe(false);
    });
  });
});