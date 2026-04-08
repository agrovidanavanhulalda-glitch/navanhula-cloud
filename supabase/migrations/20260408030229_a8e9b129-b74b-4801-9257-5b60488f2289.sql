-- Fix CEO profile: set company_id, full_name, email
UPDATE profiles 
SET 
  company_id = '007e5961-2c47-4b65-9e36-9d2b55ec58f2',
  full_name = 'Agostinho Alberto Navanhula',
  email = 'agrovidanavanhulalda@gmail.com',
  store_id = '273cd183-52f4-437d-95ba-4876dffb1fd9'
WHERE id = 'd9b128a1-e0f1-40c3-8ea8-616f83ccd10c';

-- Update role from admin to ceo
UPDATE user_roles 
SET role = 'ceo'
WHERE user_id = 'd9b128a1-e0f1-40c3-8ea8-616f83ccd10c';