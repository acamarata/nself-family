'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import type { Recipe, RecipeIngredient, RecipeStep, MealPlan } from '@/types';

const RECIPES_QUERY = `
  query GetRecipes($familyId: uuid!, $limit: Int!, $offset: Int!) {
    recipes(
      where: { family_id: { _eq: $familyId }, is_deleted: { _eq: false } },
      order_by: { created_at: desc },
      limit: $limit, offset: $offset
    ) {
      id family_id title description prep_time_minutes cook_time_minutes
      servings difficulty cuisine visibility source_url cover_image_id
      created_by is_deleted metadata created_at updated_at
    }
    recipes_aggregate(where: { family_id: { _eq: $familyId }, is_deleted: { _eq: false } }) {
      aggregate { count }
    }
  }
`;

const RECIPE_DETAIL_QUERY = `
  query GetRecipe($id: uuid!) {
    recipes_by_pk(id: $id) {
      id family_id title description prep_time_minutes cook_time_minutes
      servings difficulty cuisine visibility source_url cover_image_id
      created_by is_deleted metadata created_at updated_at
      recipe_ingredients(order_by: { sort_order: asc }) {
        id recipe_id name amount unit sort_order notes
      }
      recipe_steps(order_by: { step_number: asc }) {
        id recipe_id step_number instruction media_id duration_minutes
      }
    }
  }
`;

const CREATE_RECIPE_MUTATION = `
  mutation CreateRecipe($object: recipes_insert_input!) {
    insert_recipes_one(object: $object) { id }
  }
`;

const UPDATE_RECIPE_MUTATION = `
  mutation UpdateRecipe($id: uuid!, $set: recipes_set_input!) {
    update_recipes_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const DELETE_RECIPE_MUTATION = `
  mutation DeleteRecipe($id: uuid!) {
    update_recipes_by_pk(pk_columns: { id: $id }, _set: { is_deleted: true }) { id }
  }
`;

const MEAL_PLANS_QUERY = `
  query GetMealPlans($familyId: uuid!, $start: date!, $end: date!) {
    meal_plans(
      where: { family_id: { _eq: $familyId }, date: { _gte: $start, _lte: $end } },
      order_by: [{ date: asc }, { meal_type: asc }]
    ) {
      id family_id date meal_type recipe_id title notes servings
      created_by created_at updated_at
      recipe { id title cuisine prep_time_minutes cook_time_minutes }
    }
  }
`;

const UPSERT_MEAL_PLAN_MUTATION = `
  mutation UpsertMealPlan($object: meal_plans_insert_input!) {
    insert_meal_plans_one(
      object: $object,
      on_conflict: { constraint: meal_plans_family_id_date_meal_type_key, update_columns: [recipe_id, title, notes, servings] }
    ) { id }
  }
`;

const DELETE_MEAL_PLAN_MUTATION = `
  mutation DeleteMealPlan($id: uuid!) {
    delete_meal_plans_by_pk(id: $id) { id }
  }
`;

const PAGE_SIZE = 20;

/**
 * Hook to fetch recipes with infinite scroll pagination.
 * @returns Paginated recipes query
 */
export function useRecipes() {
  const { execute } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useInfiniteQuery({
    queryKey: ['recipes', familyId],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await execute<{
        recipes: Recipe[];
        recipes_aggregate: { aggregate: { count: number } };
      }>(RECIPES_QUERY, { familyId, limit: PAGE_SIZE, offset: pageParam });
      return {
        recipes: data.recipes,
        total: data.recipes_aggregate.aggregate.count,
        nextOffset: pageParam + PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.nextOffset < lastPage.total ? lastPage.nextOffset : undefined,
    initialPageParam: 0,
    enabled: !!familyId,
  });
}

/**
 * Hook to fetch a single recipe with ingredients and steps.
 * @param id - Recipe ID
 * @returns Recipe detail query
 */
export function useRecipeDetail(id: string | null) {
  const { execute } = useGraphQL();

  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const data = await execute<{
        recipes_by_pk: Recipe & {
          recipe_ingredients: RecipeIngredient[];
          recipe_steps: RecipeStep[];
        };
      }>(RECIPE_DETAIL_QUERY, { id });
      return data.recipes_by_pk;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a recipe.
 * @returns Mutation for creating recipes
 */
export function useCreateRecipe() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Recipe> & {
      recipe_ingredients?: { data: Partial<RecipeIngredient>[] };
      recipe_steps?: { data: Partial<RecipeStep>[] };
    }) => {
      const data = await execute<{ insert_recipes_one: { id: string } }>(
        CREATE_RECIPE_MUTATION,
        { object: input },
      );
      return data.insert_recipes_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

/**
 * Hook to update a recipe.
 * @returns Mutation for updating recipes
 */
export function useUpdateRecipe() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...set }: { id: string } & Partial<Recipe>) => {
      await execute(UPDATE_RECIPE_MUTATION, { id, set });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.id] });
    },
  });
}

/**
 * Hook to soft-delete a recipe.
 * @returns Mutation for deleting recipes
 */
export function useDeleteRecipe() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await execute(DELETE_RECIPE_MUTATION, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

/**
 * Hook to fetch meal plans for a date range.
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Meal plans query
 */
export function useMealPlans(startDate: string, endDate: string) {
  const { execute } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useQuery({
    queryKey: ['mealPlans', familyId, startDate, endDate],
    queryFn: async () => {
      const data = await execute<{ meal_plans: MealPlan[] }>(
        MEAL_PLANS_QUERY,
        { familyId, start: startDate, end: endDate },
      );
      return data.meal_plans;
    },
    enabled: !!familyId,
  });
}

/**
 * Hook to upsert a meal plan entry.
 * @returns Mutation for creating/updating meal plans
 */
export function useUpsertMealPlan() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<MealPlan>) => {
      const data = await execute<{ insert_meal_plans_one: { id: string } }>(
        UPSERT_MEAL_PLAN_MUTATION,
        { object: input },
      );
      return data.insert_meal_plans_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
  });
}

/**
 * Hook to delete a meal plan entry.
 * @returns Mutation for deleting meal plans
 */
export function useDeleteMealPlan() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await execute(DELETE_MEAL_PLAN_MUTATION, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
  });
}
