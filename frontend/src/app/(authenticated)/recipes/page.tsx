'use client';

import { useState, Fragment } from 'react';
import { useRecipes, useRecipeDetail, useCreateRecipe, useDeleteRecipe } from '@/hooks/use-recipes';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

/**
 * Recipe authoring and browsing page.
 */
export default function RecipesPage() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useRecipes();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const recipes = data?.pages.flatMap((p) => p.recipes) ?? [];

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recipes</h1>
        <button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary text-sm">
          Add Recipe
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading recipes...</p>}

      {/* Recipe grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="cursor-pointer rounded-lg border border-slate-200 p-4 transition-colors hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-600"
            onClick={() => setSelectedRecipeId(recipe.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setSelectedRecipeId(recipe.id); }}
          >
            <h3 className="font-medium">{recipe.title}</h3>
            {recipe.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{recipe.description}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recipe.cuisine && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{recipe.cuisine}</span>}
              {recipe.difficulty && <span className={`rounded px-1.5 py-0.5 text-xs ${DIFFICULTY_COLORS[recipe.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>{recipe.difficulty}</span>}
            </div>
            <div className="mt-2 flex gap-3 text-xs text-slate-400">
              {recipe.prep_time_minutes != null && <span>Prep: {recipe.prep_time_minutes}m</span>}
              {recipe.cook_time_minutes != null && <span>Cook: {recipe.cook_time_minutes}m</span>}
              {recipe.servings != null && <span>Serves: {recipe.servings}</span>}
            </div>
          </div>
        ))}
      </div>

      {!isLoading && recipes.length === 0 && (
        <p className="text-center text-sm text-slate-500">No recipes yet. Add your family's favorite recipes!</p>
      )}

      {hasNextPage && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn text-sm"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {showCreate && <CreateRecipeModal onClose={() => setShowCreate(false)} />}
      {selectedRecipeId && <RecipeDetailModal recipeId={selectedRecipeId} onClose={() => setSelectedRecipeId(null)} />}
    </div>
  );
}

function RecipeDetailModal({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const { data: recipe, isLoading } = useRecipeDetail(recipeId);
  const userId = useAuthStore((s) => s.user?.id);
  const deleteRecipe = useDeleteRecipe();

  async function handleDelete() {
    await deleteRecipe.mutateAsync(recipeId);
    onClose();
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Recipe details">
        <div className="rounded-lg bg-white p-6 dark:bg-slate-800">
          <p className="text-sm text-slate-500">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) return null;

  const ingredients = (recipe as any).recipe_ingredients ?? [];
  const steps = (recipe as any).recipe_steps ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose} role="dialog" aria-label="Recipe details">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-xl font-bold">{recipe.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">&times;</button>
        </div>
        {recipe.description && <p className="mb-3 text-sm text-slate-500">{recipe.description}</p>}

        <div className="mb-4 flex flex-wrap gap-3 text-sm text-slate-500">
          {recipe.prep_time_minutes != null && <span>Prep: {recipe.prep_time_minutes}m</span>}
          {recipe.cook_time_minutes != null && <span>Cook: {recipe.cook_time_minutes}m</span>}
          {recipe.servings != null && <span>Serves: {recipe.servings}</span>}
          {recipe.difficulty && <span className={`rounded px-1.5 py-0.5 text-xs ${DIFFICULTY_COLORS[recipe.difficulty] ?? ''}`}>{recipe.difficulty}</span>}
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
        </div>

        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="mb-3 block text-sm text-blue-600 hover:underline">
            View source
          </a>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 font-medium">Ingredients</h3>
            <ul className="space-y-1">
              {ingredients.map((ing: any) => (
                <li key={ing.id} className="flex items-baseline gap-2 text-sm">
                  <span className="text-slate-400">&bull;</span>
                  <span>
                    {ing.amount != null && `${ing.amount} `}
                    {ing.unit && `${ing.unit} `}
                    {ing.name}
                    {ing.notes && <span className="text-slate-400"> ({ing.notes})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 font-medium">Steps</h3>
            <ol className="space-y-2">
              {steps.map((step: any) => (
                <li key={step.id} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                    {step.step_number}
                  </span>
                  <div>
                    <p>{step.instruction}</p>
                    {step.duration_minutes != null && (
                      <span className="text-xs text-slate-400">{step.duration_minutes} min</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {recipe.created_by === userId && (
            <button type="button" onClick={handleDelete} disabled={deleteRecipe.isPending} className="btn text-sm text-red-600 hover:text-red-700">
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} className="btn text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

function CreateRecipeModal({ onClose }: { onClose: () => void }) {
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  const createRecipe = useCreateRecipe();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredients, setIngredients] = useState<Array<{ name: string; amount: string; unit: string; notes: string }>>([
    { name: '', amount: '', unit: '', notes: '' },
  ]);
  const [steps, setSteps] = useState<Array<{ instruction: string; duration: string }>>([
    { instruction: '', duration: '' },
  ]);

  function updateIngredient(i: number, field: string, value: string) {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  }

  function updateStep(i: number, field: string, value: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || !title) return;

    const ingredientData = ingredients
      .filter((i) => i.name.trim())
      .map((i, idx) => ({
        name: i.name,
        amount: i.amount ? parseFloat(i.amount) : null,
        unit: i.unit || null,
        sort_order: idx + 1,
        notes: i.notes || null,
      }));

    const stepData = steps
      .filter((s) => s.instruction.trim())
      .map((s, idx) => ({
        step_number: idx + 1,
        instruction: s.instruction,
        duration_minutes: s.duration ? parseInt(s.duration, 10) : null,
      }));

    await createRecipe.mutateAsync({
      family_id: familyId,
      title,
      description: description || null,
      prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime, 10) : null,
      servings: servings ? parseInt(servings, 10) : null,
      difficulty: difficulty || null,
      cuisine: cuisine || null,
      source_url: sourceUrl || null,
      created_by: userId,
      recipe_ingredients: ingredientData.length > 0 ? { data: ingredientData } : undefined,
      recipe_steps: stepData.length > 0 ? { data: stepData } : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose} role="dialog" aria-label="Add recipe">
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800"
      >
        <h2 className="mb-4 text-lg font-bold">Add Recipe</h2>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recipe title" className="input w-full" required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="input w-full" rows={2} />

          <div className="flex gap-2">
            <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="Prep (min)" className="input flex-1" aria-label="Prep time in minutes" />
            <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="Cook (min)" className="input flex-1" aria-label="Cook time in minutes" />
            <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="Serves" className="input flex-1" aria-label="Number of servings" />
          </div>

          <div className="flex gap-2">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input flex-1" aria-label="Difficulty">
              <option value="">Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <input type="text" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Cuisine" className="input flex-1" />
          </div>

          <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Source URL (optional)" className="input w-full" />

          {/* Ingredients */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Ingredients</h3>
            {ingredients.map((ing, i) => (
              <div key={i} className="mb-2 flex gap-1">
                <input type="text" value={ing.amount} onChange={(e) => updateIngredient(i, 'amount', e.target.value)} placeholder="Amt" className="input w-16" aria-label={`Ingredient ${i + 1} amount`} />
                <input type="text" value={ing.unit} onChange={(e) => updateIngredient(i, 'unit', e.target.value)} placeholder="Unit" className="input w-16" aria-label={`Ingredient ${i + 1} unit`} />
                <input type="text" value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient name" className="input flex-1" aria-label={`Ingredient ${i + 1} name`} />
              </div>
            ))}
            <button type="button" onClick={() => setIngredients([...ingredients, { name: '', amount: '', unit: '', notes: '' }])} className="text-xs text-blue-600 hover:text-blue-700">
              + Add ingredient
            </button>
          </div>

          {/* Steps */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Steps</h3>
            {steps.map((step, i) => (
              <div key={i} className="mb-2">
                <div className="flex items-start gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs">{i + 1}</span>
                  <textarea value={step.instruction} onChange={(e) => updateStep(i, 'instruction', e.target.value)} placeholder={`Step ${i + 1} instructions`} className="input flex-1" rows={2} aria-label={`Step ${i + 1} instruction`} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setSteps([...steps, { instruction: '', duration: '' }])} className="text-xs text-blue-600 hover:text-blue-700">
              + Add step
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn text-sm">Cancel</button>
          <button type="submit" disabled={createRecipe.isPending} className="btn btn-primary text-sm">
            {createRecipe.isPending ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
