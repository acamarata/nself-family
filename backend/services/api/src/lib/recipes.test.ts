import { describe, it, expect, vi } from 'vitest';
import { createRecipe, generateShoppingList } from './recipes';

function mockPool(rows: unknown[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  } as any;
}

describe('recipes', () => {
  describe('createRecipe', () => {
    it('inserts recipe with all fields', async () => {
      const pool = mockPool([{ id: 'recipe-1' }]);
      const result = await createRecipe(pool, {
        family_id: 'fam-1',
        title: 'Chicken Biryani',
        description: 'A classic rice dish',
        prep_time_minutes: 30,
        cook_time_minutes: 60,
        servings: 6,
        difficulty: 'medium',
        cuisine: 'South Asian',
        visibility: 'family',
        source_url: 'https://example.com/biryani',
        created_by: 'user-1',
      });
      expect(result).toBe('recipe-1');
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO public.recipes');
      expect(params[0]).toBe('fam-1');
      expect(params[1]).toBe('Chicken Biryani');
      expect(params[2]).toBe('A classic rice dish');
      expect(params[10]).toBe('user-1');
    });

    it('uses defaults for optional fields', async () => {
      const pool = mockPool([{ id: 'recipe-2' }]);
      await createRecipe(pool, {
        family_id: 'fam-1',
        title: 'Simple Salad',
        created_by: 'user-2',
      });
      const params = pool.query.mock.calls[0][1];
      expect(params[2]).toBeNull();      // description
      expect(params[3]).toBeNull();      // prep_time_minutes
      expect(params[4]).toBeNull();      // cook_time_minutes
      expect(params[5]).toBeNull();      // servings
      expect(params[6]).toBeNull();      // difficulty
      expect(params[7]).toBeNull();      // cuisine
      expect(params[8]).toBe('family');  // visibility default
      expect(params[9]).toBeNull();      // source_url
    });

    it('inserts ingredients with recipe', async () => {
      const pool = mockPool([{ id: 'recipe-3' }]);
      await createRecipe(
        pool,
        { family_id: 'fam-1', title: 'Pasta', created_by: 'user-1' },
        [
          { name: 'Spaghetti', amount: 500, unit: 'g', sort_order: 1, notes: 'dried' },
          { name: 'Olive Oil', amount: 2, unit: 'tbsp', sort_order: 2 },
        ],
      );
      // 1 recipe insert + 2 ingredient inserts
      expect(pool.query).toHaveBeenCalledTimes(3);
      const [sql1, params1] = pool.query.mock.calls[1];
      expect(sql1).toContain('INSERT INTO public.recipe_ingredients');
      expect(params1[0]).toBe('recipe-3');
      expect(params1[1]).toBe('Spaghetti');
      expect(params1[2]).toBe(500);
      expect(params1[3]).toBe('g');
      expect(params1[4]).toBe(1);
      expect(params1[5]).toBe('dried');
    });

    it('inserts steps with recipe', async () => {
      const pool = mockPool([{ id: 'recipe-4' }]);
      await createRecipe(
        pool,
        { family_id: 'fam-1', title: 'Toast', created_by: 'user-1' },
        [],
        [
          { step_number: 1, instruction: 'Put bread in toaster', duration_minutes: 1 },
          { step_number: 2, instruction: 'Wait until golden', media_id: 'media-1' },
        ],
      );
      // 1 recipe insert + 2 step inserts
      expect(pool.query).toHaveBeenCalledTimes(3);
      const [sql1, params1] = pool.query.mock.calls[1];
      expect(sql1).toContain('INSERT INTO public.recipe_steps');
      expect(params1[0]).toBe('recipe-4');
      expect(params1[1]).toBe(1);
      expect(params1[2]).toBe('Put bread in toaster');
      expect(params1[3]).toBeNull(); // no media_id
      expect(params1[4]).toBe(1);    // duration_minutes

      const params2 = pool.query.mock.calls[2][1];
      expect(params2[3]).toBe('media-1'); // media_id on step 2
      expect(params2[4]).toBeNull();      // no duration_minutes
    });

    it('handles recipe with both ingredients and steps', async () => {
      const pool = mockPool([{ id: 'recipe-5' }]);
      await createRecipe(
        pool,
        { family_id: 'fam-1', title: 'Full Recipe', created_by: 'user-1' },
        [{ name: 'Flour', sort_order: 1 }],
        [{ step_number: 1, instruction: 'Mix ingredients' }],
      );
      // 1 recipe + 1 ingredient + 1 step
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('handles recipe with no ingredients or steps', async () => {
      const pool = mockPool([{ id: 'recipe-6' }]);
      const result = await createRecipe(pool, {
        family_id: 'fam-1',
        title: 'Empty Recipe',
        created_by: 'user-1',
      });
      expect(result).toBe('recipe-6');
      expect(pool.query).toHaveBeenCalledOnce();
    });
  });

  describe('generateShoppingList', () => {
    it('aggregates ingredients from meal plans', async () => {
      const pool = mockPool([
        { name: 'Chicken', total_amount: 2000, unit: 'g' },
        { name: 'Rice', total_amount: 1500, unit: 'g' },
        { name: 'Salt', total_amount: null, unit: null },
      ]);
      const result = await generateShoppingList(pool, 'fam-1', '2025-06-01', '2025-06-07');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Chicken', total_amount: 2000, unit: 'g' });
      expect(result[2]).toEqual({ name: 'Salt', total_amount: null, unit: null });

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('meal_plans');
      expect(sql).toContain('recipe_ingredients');
      expect(sql).toContain('GROUP BY');
      expect(params).toEqual(['fam-1', '2025-06-01', '2025-06-07']);
    });

    it('returns empty array when no meal plans in range', async () => {
      const pool = mockPool([]);
      const result = await generateShoppingList(pool, 'fam-1', '2025-01-01', '2025-01-07');
      expect(result).toEqual([]);
    });
  });
});
