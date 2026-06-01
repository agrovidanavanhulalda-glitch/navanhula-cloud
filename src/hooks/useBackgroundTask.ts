import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRY';

export interface BackgroundTask {
  id: string;
  company_id: string | null;
  task_type: string;
  payload: Json;
  status: TaskStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const useBackgroundTask = () => {
  const enqueueTask = async (
    taskType: string,
    payload: any,
    companyId?: string,
    maxAttempts: number = 3
  ) => {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('background_tasks')
      .insert({
        task_type: taskType,
        payload,
        company_id: companyId,
        max_attempts: maxAttempts,
        created_by: userData.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error enqueuing background task:', error);
      throw error;
    }

    return data;
  };

  const getTaskStatus = async (taskId: string) => {
    const { data, error } = await supabase
      .from('background_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('Error fetching task status:', error);
      throw error;
    }

    return data as BackgroundTask;
  };

  return {
    enqueueTask,
    getTaskStatus,
  };
};
