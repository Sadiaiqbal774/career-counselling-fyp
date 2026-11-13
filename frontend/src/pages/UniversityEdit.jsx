import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { universityService } from '../services/universityService';
import ProgramForm from '../components/ProgramForm';
import '../pages/UniversityEdit.css';

export default function UniversityEdit() {
  const { id } = useParams(); // university id
  const navigate = useNavigate();
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showProgramForm, setShowProgramForm] = useState(false);

  const loadUniversity = async () => {
    setLoading(true);
    const { data, error } = await universityService.getById(id);
    if (error) {
      console.error(error);
      alert('Failed to load university');
    } else {
      setUniversity(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUniversity();
    // eslint-disable-next-line
  }, [id]);

  const handleUniversityChange = (e) => {
    setUniversity({ ...university, [e.target.name]: e.target.value });
  };

  const saveUniversity = async (e) => {
    e.preventDefault();
    const { data, error } = await universityService.supabase
      .from('universities')
      .update({
        name: university.name,
        city: university.city,
        province: university.province,
        sector: university.sector,
        website: university.website,
      })
      .eq('id', id);
    if (error) {
      console.error(error);
      alert('Failed to save university');
    } else {
      alert('University saved');
    }
  };

  // Program handlers
  const saveProgram = async (programData) => {
    if (editingProgram) {
      await universityService.updateProgram(editingProgram.id, programData);
    } else {
      await universityService.createProgram(id, programData);
    }
    setShowProgramForm(false);
    setEditingProgram(null);
    loadUniversity();
  };

  const deleteProgram = async (progId) => {
    if (!window.confirm('Delete this program?')) return;
    await universityService.deleteProgram(progId);
    loadUniversity();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <Link to="/admin" className="text-sm underline mb-4 block">
        ← Back to Admin Dashboard
      </Link>
      <h2 className="text-2xl font-bold mb-2">Edit University</h2>
      <form onSubmit={saveUniversity} className="admin-form mb-6">
        <div className="field-group">
          <label className="field-label">Name</label>
          <input className="mark-input" name="name" value={university.name || ''} onChange={handleUniversityChange} required />
        </div>
        <div className="field-group">
          <label className="field-label">City</label>
          <input className="mark-input" name="city" value={university.city || ''} onChange={handleUniversityChange} />
        </div>
        <div className="field-group">
          <label className="field-label">Province</label>
          <input className="mark-input" name="province" value={university.province || ''} onChange={handleUniversityChange} />
        </div>
        <div className="field-group">
          <label className="field-label">Sector</label>
          <input className="mark-input" name="sector" value={university.sector || ''} onChange={handleUniversityChange} />
        </div>
        <div className="field-group">
          <label className="field-label">Website</label>
          <input className="mark-input" name="website" value={university.website || ''} onChange={handleUniversityChange} />
        </div>
        <div className="button-group">
          <button type="submit" className="submit-btn">Save University</button>
        </div>
      </form>

      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Programs</h3>
        <button className="submit-btn" onClick={() => { setEditingProgram(null); setShowProgramForm(true); }}>+ Add Program</button>
      </div>
      <ul className="program-list">
        {university.programs && university.programs.length ? (
          university.programs.map((prog) => (
            <li key={prog.id} className="program-item mb-4 p-4 border rounded">
              <div>
                <strong>{prog.name}</strong> ({prog.degree_name || '-'} – {prog.duration_years || '-'} yr)
              </div>
              <div className="mt-2 button-group">
                <button className="clear-btn" onClick={() => { setEditingProgram(prog); setShowProgramForm(true); }}>Edit</button>
                <button className="clear-btn" onClick={() => deleteProgram(prog.id)}>Delete</button>
              </div>
            </li>
          ))
        ) : (
          <p className="text-muted">No programs added yet.</p>
        )}
      </ul>

      {showProgramForm && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h4 className="section-title mb-3">{editingProgram ? 'Edit Program' : 'Add New Program'}</h4>
          <ProgramForm program={editingProgram} onSave={saveProgram} onCancel={() => { setShowProgramForm(false); setEditingProgram(null); }} />
        </div>
      )}
    </div>
  );
}
