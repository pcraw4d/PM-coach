import { createClient } from '@supabase/supabase-js';
import { User, HistoryItem, KnowledgeMission, InterviewResult, Question, InterviewType } from '../types';

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

  async updateHistoryItem(userId: string, itemId: string, updates: Partial<HistoryItem>): Promise<void> {
    if (!supabase) return;
    
    // Map frontend fields to DB columns if necessary
    const dbUpdates: any = {};
    if (updates.result) dbUpdates.result = updates.result;
    if (updates.title) dbUpdates.title = updates.title;
    // Add other fields as needed

    const { error } = await supabase
      .from('history')
      .update(dbUpdates)
      .eq('user_id', userId)
      .eq('id', itemId);

    if (error) {
      console.error('Error updating history item:', error);
      throw error;
    }
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
  },

  async signIn(email: string, password: string): Promise<{ user: any; error: string | null }> {
    if (!supabase) return { user: null, error: 'Supabase not initialized' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    return { user: data.user, error: null };
  },

  async signUp(email: string, password: string, name: string): Promise<{ user: any; error: string | null }> {
    if (!supabase) return { user: null, error: 'Supabase not initialized' };
    
    // Check waitlist first
    const isApproved = await this.checkWaitlistApproval(email);
    if (!isApproved) return { user: null, error: 'WAITLIST_NOT_APPROVED' };

    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: {
                name,
                avatar_seed: 'pm-' + Date.now(),
                joined_at: Date.now()
            }
        }
    });
    
    if (error) return { user: null, error: error.message };
    
    return { user: data.user, error: null };
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async getSession(): Promise<any | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  },

  async applyToWaitlist(email: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Supabase not initialized' };
    const { error } = await supabase
      .from('waitlist')
      .insert([{ email, status: 'pending', created_at: Date.now() }]);
    
    if (error) {
        if (error.code === '23505') return { error: 'ALREADY_APPLIED' };
        return { error: error.message };
    }
    return { error: null };
  },

  async checkWaitlistApproval(email: string): Promise<boolean> {
    if (!supabase) return false;
    const { data, error } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .eq('status', 'approved')
      .maybeSingle();

    if (error) {
      console.error('Error checking waitlist approval:', error);
      return false;
    }

    return data !== null;
  },

  async checkEmailStatus(email: string): Promise<'has-account' | 'approved' | 'pending' | 'unknown'> {
    if (!supabase) return 'unknown';

    // 1. Check if user already has an account
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userData) return 'has-account';
    if (userError) console.error('Error checking user status:', userError);

    // 2. Check waitlist status
    const { data: waitlistData, error: waitlistError } = await supabase
      .from('waitlist')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (waitlistError) {
      console.error('Error checking waitlist status:', waitlistError);
      return 'unknown';
    }

    if (waitlistData) {
      if (waitlistData.status === 'approved') return 'approved';
      if (waitlistData.status === 'pending') return 'pending';
    }

    return 'unknown';
  },

  async getQuestions(userId?: string): Promise<Question[]> {
    if (!supabase) return [];
    
    let query = supabase.from('questions').select('*');
    
    if (userId) {
      // Fetch approved questions OR questions created by this user
      query = query.or(`is_approved.eq.true,created_by.eq.${userId}`);
    } else {
      query = query.eq('is_approved', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }

    return data.map((q: any) => ({
      id: q.id,
      type: q.type as InterviewType,
      text: q.text,
      hint: q.hint,
      isCustom: q.is_custom,
      isApproved: q.is_approved,
      category: q.question_type // Map question_type to category for grouping
    }));
  },

  async addCustomQuestion(userId: string, text: string, type: InterviewType, hint: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('questions')
      .insert([
        {
          text,
          type,
          hint,
          is_approved: false,
          created_by: userId,
          is_custom: true
        }
      ]);

    if (error) {
      console.error('Error adding custom question:', error);
      throw error;
    }
  }
};
