import { describe, it, expect } from 'vitest';
import {
  EventSchema, EventInviteSchema, TripSchema, TripItineraryItemSchema,
  LocationShareSchema, GeofenceSchema, RecipeSchema, RecipeIngredientSchema,
  RecipeStepSchema, MealPlanSchema,
  RSVP_STATUSES, TRIP_STATUSES, MEAL_TYPES,
} from './index';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

describe('Phase 5 types', () => {
  describe('enums', () => {
    it('defines RSVP statuses', () => {
      expect(RSVP_STATUSES).toContain('pending');
      expect(RSVP_STATUSES).toContain('accepted');
      expect(RSVP_STATUSES).toContain('declined');
      expect(RSVP_STATUSES).toContain('maybe');
      expect(RSVP_STATUSES.length).toBe(4);
    });

    it('defines trip statuses', () => {
      expect(TRIP_STATUSES).toContain('planning');
      expect(TRIP_STATUSES).toContain('confirmed');
      expect(TRIP_STATUSES).toContain('in_progress');
      expect(TRIP_STATUSES).toContain('completed');
      expect(TRIP_STATUSES).toContain('cancelled');
      expect(TRIP_STATUSES.length).toBe(5);
    });

    it('defines meal types', () => {
      expect(MEAL_TYPES).toContain('breakfast');
      expect(MEAL_TYPES).toContain('lunch');
      expect(MEAL_TYPES).toContain('dinner');
      expect(MEAL_TYPES).toContain('snack');
      expect(MEAL_TYPES.length).toBe(4);
    });
  });

  describe('EventSchema', () => {
    it('validates a correct event', () => {
      const event = {
        id: UUID, family_id: UUID2, title: 'Birthday', description: null,
        start_at: '2025-06-15T14:00:00Z', end_at: null, all_day: false,
        location: null, recurrence_rule: null, color: null,
        created_by: UUID, is_deleted: false, metadata: {},
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => EventSchema.parse(event)).not.toThrow();
    });

    it('rejects event without title', () => {
      const event = {
        id: UUID, family_id: UUID2, title: '',
        start_at: '2025-06-15T14:00:00Z', all_day: false,
        created_by: UUID, is_deleted: false,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => EventSchema.parse(event)).toThrow();
    });

    it('validates all-day event', () => {
      const event = {
        id: UUID, family_id: UUID2, title: 'Holiday', description: null,
        start_at: '2025-12-25T00:00:00Z', end_at: '2025-12-26T00:00:00Z',
        all_day: true, location: null, recurrence_rule: null, color: '#ff0000',
        created_by: UUID, is_deleted: false, metadata: {},
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      const parsed = EventSchema.parse(event);
      expect(parsed.all_day).toBe(true);
      expect(parsed.color).toBe('#ff0000');
    });
  });

  describe('EventInviteSchema', () => {
    it('validates a correct invite', () => {
      const invite = {
        id: UUID, event_id: UUID2, user_id: UUID,
        status: 'accepted', responded_at: '2025-06-15T14:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(() => EventInviteSchema.parse(invite)).not.toThrow();
    });

    it('rejects invalid RSVP status', () => {
      const invite = {
        id: UUID, event_id: UUID2, user_id: UUID,
        status: 'invalid', responded_at: null,
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(() => EventInviteSchema.parse(invite)).toThrow();
    });
  });

  describe('TripSchema', () => {
    it('validates a correct trip', () => {
      const trip = {
        id: UUID, family_id: UUID2, title: 'Beach Vacation',
        destination: 'Hawaii', description: 'Annual family trip',
        start_date: '2025-07-01', end_date: '2025-07-14',
        status: 'planning', event_id: null, created_by: UUID,
        metadata: {}, created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => TripSchema.parse(trip)).not.toThrow();
    });

    it('rejects invalid trip status', () => {
      const trip = {
        id: UUID, family_id: UUID2, title: 'Trip',
        destination: null, description: null, start_date: null, end_date: null,
        status: 'invalid', event_id: null, created_by: UUID,
        metadata: {}, created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => TripSchema.parse(trip)).toThrow();
    });
  });

  describe('TripItineraryItemSchema', () => {
    it('validates a correct itinerary item', () => {
      const item = {
        id: UUID, trip_id: UUID2, day_number: 1,
        start_time: '09:00', end_time: '12:00',
        activity: 'Visit museum', location: 'Downtown',
        notes: 'Bring camera', sort_order: 1, created_by: UUID,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => TripItineraryItemSchema.parse(item)).not.toThrow();
    });
  });

  describe('LocationShareSchema', () => {
    it('validates a correct location share', () => {
      const loc = {
        id: UUID, user_id: UUID2, family_id: UUID,
        latitude: 40.7128, longitude: -74.006,
        accuracy: 10, altitude: 50, heading: 180, speed: 1.5,
        expires_at: '2025-06-15T15:00:00Z', created_at: '2025-06-15T14:00:00Z',
      };
      expect(() => LocationShareSchema.parse(loc)).not.toThrow();
    });

    it('validates with nullable optional fields', () => {
      const loc = {
        id: UUID, user_id: UUID2, family_id: UUID,
        latitude: -33.8688, longitude: 151.2093,
        accuracy: null, altitude: null, heading: null, speed: null,
        expires_at: '2025-06-15T15:00:00Z', created_at: '2025-06-15T14:00:00Z',
      };
      const parsed = LocationShareSchema.parse(loc);
      expect(parsed.accuracy).toBeNull();
      expect(parsed.latitude).toBe(-33.8688);
    });
  });

  describe('GeofenceSchema', () => {
    it('validates a correct geofence', () => {
      const fence = {
        id: UUID, family_id: UUID2, name: 'Home',
        center_lat: 40.7128, center_lng: -74.006, radius_meters: 200,
        alert_on_enter: true, alert_on_exit: true,
        monitored_user_ids: [UUID], created_by: UUID,
        is_active: true, created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => GeofenceSchema.parse(fence)).not.toThrow();
    });
  });

  describe('RecipeSchema', () => {
    it('validates a correct recipe', () => {
      const recipe = {
        id: UUID, family_id: UUID2, title: 'Pasta',
        description: 'Simple pasta', prep_time_minutes: 10,
        cook_time_minutes: 20, servings: 4, difficulty: 'easy',
        cuisine: 'Italian', visibility: 'family', source_url: null,
        cover_image_id: null, created_by: UUID, is_deleted: false,
        metadata: {}, created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => RecipeSchema.parse(recipe)).not.toThrow();
    });

    it('rejects recipe without title', () => {
      const recipe = {
        id: UUID, family_id: UUID2, title: '',
        description: null, prep_time_minutes: null,
        cook_time_minutes: null, servings: null, difficulty: null,
        cuisine: null, visibility: 'family', source_url: null,
        cover_image_id: null, created_by: UUID, is_deleted: false,
        metadata: {}, created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => RecipeSchema.parse(recipe)).toThrow();
    });

    it('defaults visibility to family', () => {
      const recipe = {
        id: UUID, family_id: UUID2, title: 'Test',
        description: null, prep_time_minutes: null,
        cook_time_minutes: null, servings: null, difficulty: null,
        cuisine: null, source_url: null,
        cover_image_id: null, created_by: UUID, is_deleted: false,
        metadata: {}, created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const parsed = RecipeSchema.parse(recipe);
      expect(parsed.visibility).toBe('family');
    });
  });

  describe('RecipeIngredientSchema', () => {
    it('validates a correct ingredient', () => {
      const ingredient = {
        id: UUID, recipe_id: UUID2, name: 'Flour',
        amount: 500, unit: 'g', sort_order: 1, notes: 'sifted',
      };
      expect(() => RecipeIngredientSchema.parse(ingredient)).not.toThrow();
    });
  });

  describe('RecipeStepSchema', () => {
    it('validates a correct step', () => {
      const step = {
        id: UUID, recipe_id: UUID2, step_number: 1,
        instruction: 'Mix dry ingredients',
        media_id: null, duration_minutes: 5,
      };
      expect(() => RecipeStepSchema.parse(step)).not.toThrow();
    });
  });

  describe('MealPlanSchema', () => {
    it('validates a correct meal plan', () => {
      const plan = {
        id: UUID, family_id: UUID2, date: '2025-06-15',
        meal_type: 'dinner', recipe_id: UUID, title: 'Pasta Night',
        notes: null, servings: 4, created_by: UUID,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => MealPlanSchema.parse(plan)).not.toThrow();
    });

    it('rejects invalid meal type', () => {
      const plan = {
        id: UUID, family_id: UUID2, date: '2025-06-15',
        meal_type: 'brunch', recipe_id: null, title: null,
        notes: null, servings: null, created_by: UUID,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(() => MealPlanSchema.parse(plan)).toThrow();
    });
  });
});
