
-- Fix: restrict INSERT to system functions only (notifications are created by triggers/SECURITY DEFINER functions)
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "System can insert own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
