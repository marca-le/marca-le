// Credenciales de conexión Supabase
const SUPABASE_URL = 'https://ktxawubacucdinggqxct.supabase.co';
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0eGF3dWJhY3VjZGluZ2dxeGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzIzNjksImV4cCI6MjEwODM0ODM2OX0.6kQwnOB4aiTFopDOCebCYq15hLiBHsVJs0oDjCOmMTQ";

// Inicialización del cliente Supabase a través del CDN
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);