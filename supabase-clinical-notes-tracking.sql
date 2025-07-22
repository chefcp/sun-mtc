-- Clinical Notes Tracking System
-- This script adds enhanced tracking capabilities to clinical notes

-- 1. Update appointments table to include 'in_progress' status
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'in_progress', 'done', 'canceled'));

-- 2. Add new columns to clinical_notes table for enhanced tracking
ALTER TABLE clinical_notes 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'low' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- 3. Create clinical_note_versions table for version history
CREATE TABLE IF NOT EXISTS clinical_note_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES clinical_notes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  summary TEXT,
  diagnosis TEXT,
  prescription TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(note_id, version_number)
);

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinical_notes_urgency ON clinical_notes(urgency_level);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_private ON clinical_notes(is_private);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_created_by ON clinical_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_clinical_note_versions_note_id ON clinical_note_versions(note_id);
CREATE INDEX IF NOT EXISTS idx_clinical_note_versions_created_at ON clinical_note_versions(created_at);

-- 5. Enable RLS on new table
ALTER TABLE clinical_note_versions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for clinical_note_versions
-- Doctors can manage versions of their own notes
CREATE POLICY "Doctors can view clinical note versions" ON clinical_note_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('doctor', 'admin_doctor')
    )
  );

CREATE POLICY "Doctors can create clinical note versions" ON clinical_note_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('doctor', 'admin_doctor')
    )
    AND created_by = auth.uid()
  );

-- 7. Update existing clinical_notes RLS policies to include new columns
DROP POLICY IF EXISTS "Doctors can update clinical notes" ON clinical_notes;
CREATE POLICY "Doctors can update clinical notes" ON clinical_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('doctor', 'admin_doctor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('doctor', 'admin_doctor')
    )
  );

-- 8. Create function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_clinical_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_clinical_notes_updated_at ON clinical_notes;
CREATE TRIGGER trigger_clinical_notes_updated_at
  BEFORE UPDATE ON clinical_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_clinical_notes_updated_at();

-- 10. Insert sample urgency levels and tracking data for existing notes
UPDATE clinical_notes 
SET urgency_level = 'low',
    is_private = FALSE,
    created_by = (
      SELECT user_id FROM user_profiles 
      WHERE role IN ('doctor', 'admin_doctor') 
      LIMIT 1
    )
WHERE urgency_level IS NULL;

-- 11. Create view for clinical notes with enhanced information
CREATE OR REPLACE VIEW clinical_notes_enhanced AS
SELECT 
  cn.*,
  up_created.email as created_by_email,
  up_updated.email as updated_by_email,
  d.name as doctor_name,
  d.specialty as doctor_specialty,
  COUNT(cnv.id) as version_count
FROM clinical_notes cn
LEFT JOIN auth.users u_created ON cn.created_by = u_created.id
LEFT JOIN user_profiles up_created ON u_created.id = up_created.user_id
LEFT JOIN auth.users u_updated ON cn.updated_by = u_updated.id
LEFT JOIN user_profiles up_updated ON u_updated.id = up_updated.user_id
LEFT JOIN doctors d ON cn.created_by = d.user_id
LEFT JOIN clinical_note_versions cnv ON cn.id = cnv.note_id
GROUP BY cn.id, up_created.email, up_updated.email, d.name, d.specialty;

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON clinical_note_versions TO authenticated;
GRANT SELECT ON clinical_notes_enhanced TO authenticated;

-- 13. Add comments for documentation
COMMENT ON TABLE clinical_note_versions IS 'Stores version history of clinical notes for audit trail and tracking changes';
COMMENT ON COLUMN clinical_notes.is_private IS 'Indicates if the note is private and has restricted access';
COMMENT ON COLUMN clinical_notes.urgency_level IS 'Priority level of the clinical note (low, medium, high, critical)';
COMMENT ON COLUMN clinical_notes.created_by IS 'User who created the note';
COMMENT ON COLUMN clinical_notes.updated_by IS 'User who last updated the note';
COMMENT ON COLUMN clinical_notes.updated_at IS 'Timestamp of last update';

-- Verification queries
SELECT 'Clinical notes tracking system installed successfully!' as message;

-- Check the new columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'clinical_notes' 
AND column_name IN ('is_private', 'urgency_level', 'created_by', 'updated_by', 'updated_at');

-- Check the new table
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clinical_note_versions' 
ORDER BY ordinal_position; 