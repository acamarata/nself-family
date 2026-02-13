'use client';

import { useState, useMemo } from 'react';
import { useMealPlans, useUpsertMealPlan, useDeleteMealPlan, useRecipes } from '@/hooks/use-recipes';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import type { MealType } from '@/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekDates(date: Date): string[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Meal planning page with weekly view and shopping list generation.
 */
export default function MealsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showShoppingList, setShowShoppingList] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const startDate = weekDates[0];
  const endDate = weekDates[6];

  const { data: mealPlans = [], isLoading } = useMealPlans(startDate, endDate);
  const upsertMealPlan = useUpsertMealPlan();
  const deleteMealPlan = useDeleteMealPlan();
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);

  const plansByDateMeal = useMemo(() => {
    const map: Record<string, Record<string, typeof mealPlans[0]>> = {};
    for (const plan of mealPlans) {
      if (!map[plan.date]) map[plan.date] = {};
      map[plan.date][plan.meal_type] = plan;
    }
    return map;
  }, [mealPlans]);

  function navigateWeek(delta: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7 * delta);
    setCurrentDate(d);
  }

  return (
    <div className="mx-auto max-w-6xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meal Planning</h1>
        <button type="button" onClick={() => setShowShoppingList(!showShoppingList)} className="btn text-sm">
          {showShoppingList ? 'Hide' : 'Shopping List'}
        </button>
      </div>

      {/* Week navigation */}
      <div className="mb-4 flex items-center justify-center gap-4">
        <button type="button" onClick={() => navigateWeek(-1)} className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Previous week">&larr;</button>
        <span className="text-sm font-medium">
          {new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} &ndash; {new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => navigateWeek(1)} className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Next week">&rarr;</button>
        <button type="button" onClick={() => setCurrentDate(new Date())} className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50">This Week</button>
      </div>

      {isLoading && <p className="text-center text-sm text-slate-500">Loading meal plans...</p>}

      {/* Weekly grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 p-2 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800">Meal</th>
              {weekDates.map((date, i) => {
                const isToday = date === new Date().toISOString().slice(0, 10);
                return (
                  <th key={date} className={`border border-slate-200 p-2 text-center text-xs font-medium dark:border-slate-700 ${isToday ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
                    <div>{DAY_NAMES[i]}</div>
                    <div className="text-[10px]">{new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {MEAL_ORDER.map((meal) => (
              <tr key={meal}>
                <td className="border border-slate-200 bg-slate-50 p-2 text-xs font-medium capitalize text-slate-500 dark:border-slate-700 dark:bg-slate-800">{meal}</td>
                {weekDates.map((date) => {
                  const plan = plansByDateMeal[date]?.[meal];
                  return (
                    <td key={`${date}-${meal}`} className="border border-slate-200 p-1 dark:border-slate-700">
                      {plan ? (
                        <div className="group relative rounded bg-blue-50 p-1.5 text-xs dark:bg-blue-900/20">
                          <div className="font-medium text-blue-700 dark:text-blue-300">
                            {plan.recipe?.title ?? plan.title ?? 'Planned'}
                          </div>
                          {plan.notes && <div className="text-[10px] text-slate-400">{plan.notes}</div>}
                          <button
                            type="button"
                            onClick={() => deleteMealPlan.mutate(plan.id)}
                            className="absolute right-0.5 top-0.5 hidden text-[10px] text-red-400 hover:text-red-600 group-hover:block"
                            aria-label={`Remove ${meal} on ${date}`}
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <MealSlot
                          date={date}
                          mealType={meal}
                          familyId={familyId}
                          userId={userId}
                          onAdd={upsertMealPlan.mutateAsync}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shopping list */}
      {showShoppingList && <ShoppingList startDate={startDate} endDate={endDate} />}
    </div>
  );
}

function MealSlot({
  date, mealType, familyId, userId, onAdd,
}: {
  date: string; mealType: MealType; familyId: string | null; userId: string | undefined;
  onAdd: (input: any) => Promise<string>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || !title.trim()) return;
    await onAdd({
      family_id: familyId,
      date,
      meal_type: mealType,
      title: title.trim(),
      created_by: userId,
    });
    setTitle('');
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meal..."
          className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs dark:border-slate-600"
          autoFocus
          onBlur={() => { if (!title) setEditing(false); }}
          aria-label={`${mealType} for ${date}`}
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex h-8 w-full items-center justify-center text-[10px] text-slate-300 hover:text-slate-500"
      aria-label={`Add ${mealType} for ${date}`}
    >
      +
    </button>
  );
}

function ShoppingList({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: mealPlans = [] } = useMealPlans(startDate, endDate);

  // Simple aggregation of planned meals
  const items = useMemo(() => {
    const meals = mealPlans.filter((p) => p.title || p.recipe);
    return meals.map((m) => m.recipe?.title ?? m.title ?? '').filter(Boolean);
  }, [mealPlans]);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h2 className="mb-3 text-lg font-bold">Shopping List</h2>
      <p className="mb-2 text-xs text-slate-400">
        Generated from meal plans for {new Date(startDate).toLocaleDateString()} &ndash; {new Date(endDate).toLocaleDateString()}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No meals planned for this week. Add meals to generate a shopping list.</p>
      ) : (
        <div>
          <p className="mb-2 text-sm text-slate-500">Planned meals this week:</p>
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" aria-label={`Check off ${item}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Full ingredient aggregation requires recipe-linked meal plans with the shopping list API endpoint.
          </p>
        </div>
      )}
    </div>
  );
}
