export const FIELD_OF_STUDY_OPTIONS = [
  // STEM
  { value: 'computer_science', label: 'Computer Science / Software Engineering', category: 'STEM' },
  { value: 'data_science_stats', label: 'Data Science / Statistics / Mathematics', category: 'STEM' },
  { value: 'electrical_engineering', label: 'Electrical / Computer Engineering', category: 'STEM' },
  { value: 'mechanical_engineering', label: 'Mechanical / Civil / Industrial Engineering', category: 'STEM' },
  { value: 'natural_sciences', label: 'Physics / Chemistry / Biology', category: 'STEM' },
  { value: 'information_systems', label: 'Information Systems / IT', category: 'STEM' },
  { value: 'actuarial_science', label: 'Actuarial Science', category: 'STEM' },

  // Business
  { value: 'business_admin', label: 'Business Administration / Management', category: 'Business' },
  { value: 'finance_accounting', label: 'Finance / Accounting / Economics', category: 'Business' },
  { value: 'marketing_comms', label: 'Marketing / Communications', category: 'Business' },
  { value: 'operations_supply', label: 'Operations / Supply Chain', category: 'Business' },
  { value: 'human_resources', label: 'Human Resources / Organizational Behavior', category: 'Business' },

  // Social Sciences
  { value: 'psychology', label: 'Psychology', category: 'Social Sciences' },
  { value: 'sociology', label: 'Sociology / Anthropology', category: 'Social Sciences' },
  { value: 'political_science', label: 'Political Science / Public Policy', category: 'Social Sciences' },
  { value: 'english_comms', label: 'English / Communications', category: 'Social Sciences' },
  { value: 'history_philosophy', label: 'History / Philosophy', category: 'Social Sciences' },

  // Health
  { value: 'nursing_clinical', label: 'Nursing / Clinical', category: 'Health' },
  { value: 'public_health', label: 'Public Health / Epidemiology', category: 'Health' },
  { value: 'biology_biochem', label: 'Biology / Biochemistry', category: 'Health' },
  { value: 'health_admin', label: 'Health Administration', category: 'Health' },

  // Law & Policy
  { value: 'law', label: 'Law / Legal Studies', category: 'Law & Policy' },
  { value: 'public_admin', label: 'Public Administration', category: 'Law & Policy' },

  // Education
  { value: 'education', label: 'Education / Teaching', category: 'Education' },

  // Other
  { value: 'any', label: 'Any field (no requirement)', category: 'Other' },
]

export const FIELD_CATEGORIES = [...new Set(FIELD_OF_STUDY_OPTIONS.map(f => f.category))]

export function getLabelForValue(value: string): string {
  return FIELD_OF_STUDY_OPTIONS.find(f => f.value === value)?.label || value
}

export function getFieldsForCategory(category: string) {
  return FIELD_OF_STUDY_OPTIONS.filter(f => f.category === category)
}
