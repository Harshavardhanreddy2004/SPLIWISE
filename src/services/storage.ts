import { supabase } from '../lib/supabaseClient';

/**
 * Uploads a receipt image/PDF to Supabase Storage
 * @param file The file object (image or PDF)
 * @param groupId The ID of the group the expense belongs to
 * @returns The public URL of the uploaded receipt
 */
export async function uploadReceipt(file: File, groupId: string): Promise<string> {
  // 1. Ensure file size and types are valid
  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) {
    throw new Error('File size exceeds 5MB limit.');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload a PNG, JPG, WEBP image or a PDF.');
  }

  // 2. Generate unique filename inside the group directory
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `groups/${groupId}/${fileName}`;

  // 3. Upload to 'receipts' bucket
  const { error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload receipt: ${error.message}`);
  }

  // 4. Retrieve public URL
  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
