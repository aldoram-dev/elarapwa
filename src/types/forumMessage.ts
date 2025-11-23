export interface ForumMessage {
  id?: string;
  forum_id: string;
  foro_id?: string;
  user_id: string;
  parent_id?: string;
  mensaje?: string;
  message?: string | null;
  attachments?: ForumAttachment[];
  metadata?: Record<string, any>;
  user?: {
    id: string;
    nombre: string;
    email: string;
    avatar_url?: string;
  };
  created_at?: string;
  updated_at?: string;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface ForumAttachment {
  id?: string;
  message_id: string;
  file_name: string;
  name?: string;
  file_url: string;
  path?: string;
  signedUrl?: string;
  file_type: string;
  type?: string;
  mimeType?: string;
  file_size?: number;
  size?: number;
  bucket?: string;
  created_at?: string;
}
