-- 008: Recipe domain and meal planning

-- Recipes
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  prep_time_minutes INT,
  cook_time_minutes INT,
  servings INT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  cuisine TEXT,
  visibility TEXT NOT NULL DEFAULT 'family' CHECK (visibility IN ('family', 'adults_only', 'private', 'public')),
  cover_image_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  source_url TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_family ON public.recipes(family_id);

CREATE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recipe ingredients
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount REAL,
  unit TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);

-- Recipe steps
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  instruction TEXT NOT NULL,
  media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  duration_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_steps_recipe ON public.recipe_steps(recipe_id);

-- Recipe collections (cookbooks)
CREATE TABLE IF NOT EXISTS public.recipe_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_recipe_collections_updated_at
  BEFORE UPDATE ON public.recipe_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Collection items
CREATE TABLE IF NOT EXISTS public.recipe_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.recipe_collections(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, recipe_id)
);

-- Meal plans (linking recipes to calendar dates)
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  title TEXT, -- for non-recipe meals
  notes TEXT,
  servings INT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, date, meal_type)
);

CREATE INDEX idx_meal_plans_family_date ON public.meal_plans(family_id, date);
