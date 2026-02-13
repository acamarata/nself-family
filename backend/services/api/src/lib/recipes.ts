import type { Pool } from 'pg';

interface CreateRecipeInput {
  family_id: string;
  title: string;
  description?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  visibility?: string;
  source_url?: string;
  created_by: string;
}

interface RecipeIngredient {
  name: string;
  amount?: number;
  unit?: string;
  sort_order: number;
  notes?: string;
}

interface RecipeStep {
  step_number: number;
  instruction: string;
  media_id?: string;
  duration_minutes?: number;
}

/**
 * Create a recipe with ingredients and steps.
 * @param pool - Database pool
 * @param input - Recipe data
 * @param ingredients - Ingredient list
 * @param steps - Step list
 * @returns Created recipe ID
 */
export async function createRecipe(
  pool: Pool,
  input: CreateRecipeInput,
  ingredients: RecipeIngredient[] = [],
  steps: RecipeStep[] = [],
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO public.recipes
      (family_id, title, description, prep_time_minutes, cook_time_minutes,
       servings, difficulty, cuisine, visibility, source_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [input.family_id, input.title, input.description ?? null,
     input.prep_time_minutes ?? null, input.cook_time_minutes ?? null,
     input.servings ?? null, input.difficulty ?? null, input.cuisine ?? null,
     input.visibility ?? 'family', input.source_url ?? null, input.created_by],
  );
  const recipeId = rows[0].id;

  // Insert ingredients
  for (const ing of ingredients) {
    await pool.query(
      `INSERT INTO public.recipe_ingredients (recipe_id, name, amount, unit, sort_order, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [recipeId, ing.name, ing.amount ?? null, ing.unit ?? null, ing.sort_order, ing.notes ?? null],
    );
  }

  // Insert steps
  for (const step of steps) {
    await pool.query(
      `INSERT INTO public.recipe_steps (recipe_id, step_number, instruction, media_id, duration_minutes)
       VALUES ($1, $2, $3, $4, $5)`,
      [recipeId, step.step_number, step.instruction, step.media_id ?? null, step.duration_minutes ?? null],
    );
  }

  return recipeId;
}

/**
 * Generate a shopping list from meal plans for a date range.
 * @param pool - Database pool
 * @param familyId - Family ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Aggregated ingredient list
 */
export async function generateShoppingList(
  pool: Pool,
  familyId: string,
  startDate: string,
  endDate: string,
): Promise<Array<{ name: string; total_amount: number | null; unit: string | null }>> {
  const { rows } = await pool.query(
    `SELECT ri.name, SUM(ri.amount) as total_amount, ri.unit
     FROM public.meal_plans mp
     JOIN public.recipe_ingredients ri ON ri.recipe_id = mp.recipe_id
     WHERE mp.family_id = $1 AND mp.date >= $2 AND mp.date <= $3 AND mp.recipe_id IS NOT NULL
     GROUP BY ri.name, ri.unit
     ORDER BY ri.name`,
    [familyId, startDate, endDate],
  );
  return rows;
}
