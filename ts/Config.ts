export type Config = {
  bucket_name: string
  input_pdf_path_regexp: string
  output_path: string
  temp_path: string
  voice_name: string
  language_code: string
  speaking_rate?: number
  pitch?: number
  volume_gain_db?: number
  delimiter: string
};
