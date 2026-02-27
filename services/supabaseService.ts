import { createClient } from '@supabase/supabase-js';
import { User, HistoryItem, KnowledgeMission, InterviewResult } from '../types';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;

const isValidUrl = (url: string) => {
  try {
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

if (supabaseUrl && isValidUrl(supabaseUrl) && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
  }
} else {
  console.warn('Supabase credentials missing or invalid. App will fall back to local storage.');
}

export const supabase = supabaseClient;

export const supabaseService = {
  /**
   * Get or create a user in Supabase.
   * We use the ID from localStorage to try to find the user.
   * If not found, we create a new one.
   */
  async syncUser(localUser: User): Promise<User | null> {
    if (!supabase || !localUser || !localUser.id) return null;

    // 1. Try to find the user by ID (if it's a valid UUID)
    // Note: The local ID 'me' is a placeholder from the initial app state.
    // We need to handle the migration to a real UUID if possible, or just create a new user.
    
    let userId = localUser.id;
    let isNewUser = false;

    // If local ID is 'me' or not a UUID, we treat it as a new user for Supabase
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    if (!isValidUuid) {
      isNewUser = true;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        isNewUser = true;
      } else {
        return {
            id: data.id,
            name: data.name,
            email: data.email || '',
            avatarSeed: data.avatar_seed,
            joinedAt: parseInt(data.joined_at),
            hasCompletedOnboarding: true // Assumed if they exist
        };
      }
    }

    if (isNewUser) {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            name: localUser.name,
            avatar_seed: localUser.avatarSeed,
            joined_at: localUser.joinedAt,
            // We let Supabase generate the ID
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating user in Supabase:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email || '',
        avatarSeed: data.avatar_seed,
        joinedAt: parseInt(data.joined_at),
        hasCompletedOnboarding: true
      };
    }

    return null;
  },

  async updateUser(user: User): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('users')
      .update({
        name: user.name,
        avatar_seed: user.avatarSeed,
        email: user.email
      })
      .eq('id', user.id);

    if (error) console.error('Error updating user:', error);
  },

  async getHistory(userId: string): Promise<HistoryItem[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      activityType: row.activity_type,
      timestamp: parseInt(row.timestamp),
      title: row.title,
      questionTitle: row.title, // Map title to questionTitle for interviews
      type: row.question_type,
      xpAwarded: row.xp_awarded,
      result: row.result as InterviewResult
    }));
  },

  async addHistoryItem(userId: string, item: HistoryItem): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('history')
      .insert([
        {
          user_id: userId,
          activity_type: item.activityType,
          timestamp: item.timestamp,
          title: item.title || item.questionTitle,
          question_type: item.type,
          xp_awarded: item.xpAwarded,
          result: item.result
        }
      ]);

    if (error) console.error('Error adding history item:', error);
  },

  async getCompletedMissions(userId: string): Promise<string[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('user_missions')
      .select('mission_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching missions:', error);
      return [];
    }

    return data.map((row: any) => row.mission_id);
  },

  async completeMission(userId: string, missionId: string): Promise<void> {
    if (!supabase) return;
    // Check if already completed to avoid duplicates
    const { data } = await supabase
        .from('user_missions')
        .select('id')
        .eq('user_id', userId)
        .eq('mission_id', missionId)
        .single();
    
    if (data) return;

    const { error } = await supabase
      .from('user_missions')
      .insert([
        {
          user_id: userId,
          mission_id: missionId,
          completed_at: Date.now()
        }
      ]);

    if (error) console.error('Error completing mission:', error);
  }
};
