import React, { useState, useEffect } from 'react';

export default function ProgramForm({ program = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    degree_name: '',
    duration_years: '',
    description: '',
  });

  useEffect(() => {
    if (program) {
      setFormData({
        name: program.name || '',
        degree_name: program.degree_name || '',
        duration_years: program.duration_years || '',
        description: program.description || '',
      });
    }
  }, [program]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Program name is required');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="program-form">
      <div className="field-group">
        <label className="field-label">Program Name</label>
        <input className="mark-input" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div className="field-group">
        <label className="field-label">Degree Name</label>
        <input className="mark-input" name="degree_name" value={formData.degree_name} onChange={handleChange} />
      </div>
      <div className="field-group">
        <label className="field-label">Duration (years)</label>
        <input type="number" min="0" className="mark-input" name="duration_years" value={formData.duration_years} onChange={handleChange} />
      </div>
      <div className="field-group">
        <label className="field-label">Description</label>
        <textarea className="mark-input" name="description" rows="3" value={formData.description} onChange={handleChange} />
      </div>
      <div className="button-group mt-4">
        <button type="submit" className="submit-btn mr-2">
          {program ? 'Update Program' : 'Create Program'}
        </button>
        <button type="button" className="clear-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
