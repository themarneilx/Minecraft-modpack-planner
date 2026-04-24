'use client';

import { useState } from 'react';
import type { StatusInfo, Category } from '@/lib/data';
import { getIcon } from '@/lib/icons';
import IconPicker from '../IconPicker/IconPicker';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  open: boolean;
  statuses: StatusInfo[];
  categories: Category[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onSyncStart: () => () => void;
}

export default function SettingsModal({ open, statuses, categories, onClose, onRefresh, onSyncStart }: SettingsModalProps) {
  const [tab, setTab] = useState<'statuses' | 'categories'>('statuses');
  const [editing, setEditing] = useState<StatusInfo | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formColor, setFormColor] = useState('#a8e6cf');
  const [formTextColor, setFormTextColor] = useState('#1b5e3b');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Category form state
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('package');
  const [catColor, setCatColor] = useState('#e8f5e9');
  const [editingCat, setEditingCat] = useState<{ id: number; name: string; icon: string; headerBg: string } | null>(null);
  const [creatingCat, setCreatingCat] = useState(false);

  function startEditStatus(s: StatusInfo) {
    setEditing(s);
    setCreating(false);
    setFormKey(s.key);
    setFormLabel(s.label);
    setFormColor(s.color);
    setFormTextColor(s.textColor);
    setError('');
  }

  function startCreateStatus() {
    setEditing(null);
    setCreating(true);
    setFormKey('');
    setFormLabel('');
    setFormColor('#a8e6cf');
    setFormTextColor('#1b5e3b');
    setError('');
  }

  async function saveStatus() {
    if (!formKey.trim() || !formLabel.trim()) {
      setError('Key and label are required');
      return;
    }

    const finishSync = onSyncStart();
    setSaving(true);
    setError('');

    try {
      if (editing) {
        const res = await fetch(`/api/statuses/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: formKey, label: formLabel, color: formColor, textColor: formTextColor }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update');
        }
      } else {
        const res = await fetch('/api/statuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: formKey, label: formLabel, color: formColor, textColor: formTextColor }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create');
        }
      }

      setEditing(null);
      setCreating(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
      finishSync();
    }
  }

  async function deleteStatus(id: number) {
    if (!confirm('Delete this status?')) return;
    const finishSync = onSyncStart();
    try {
      const res = await fetch(`/api/statuses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
        return;
      }
      await onRefresh();
    } catch {
      alert('Failed to delete status');
    } finally {
      finishSync();
    }
  }

  // Category CRUD
  function startEditCat(c: { id: number; name: string; icon: string; headerBg: string }) {
    setEditingCat(c);
    setCreatingCat(false);
    setCatName(c.name);
    setCatIcon(c.icon);
    setCatColor(c.headerBg);
    setError('');
  }

  function startCreateCat() {
    setEditingCat(null);
    setCreatingCat(true);
    setCatName('');
    setCatIcon('package');
    setCatColor('#e8f5e9');
    setError('');
  }

  async function saveCat() {
    if (!catName.trim()) {
      setError('Name is required');
      return;
    }

    const finishSync = onSyncStart();
    setSaving(true);
    setError('');

    try {
      if (editingCat) {
        const res = await fetch(`/api/categories/${editingCat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: catName, icon: catIcon, headerBg: catColor }),
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: catName, icon: catIcon, headerBg: catColor }),
        });
        if (!res.ok) throw new Error('Failed to create');
      }

      setEditingCat(null);
      setCreatingCat(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
      finishSync();
    }
  }

  async function deleteCat(id: number) {
    if (!confirm('Delete this category and all its mods?')) return;
    const finishSync = onSyncStart();
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert('Failed to delete');
        return;
      }
      await onRefresh();
    } catch {
      alert('Failed to delete category');
    } finally {
      finishSync();
    }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Settings</div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'statuses' ? styles.active : ''}`} onClick={() => setTab('statuses')}>
            Statuses / Legend
          </button>
          <button className={`${styles.tab} ${tab === 'categories' ? styles.active : ''}`} onClick={() => setTab('categories')}>
            Categories / Columns
          </button>
        </div>

        <div className={styles.content}>
          {/* ======== STATUSES TAB ======== */}
          {tab === 'statuses' && (
            <>
              <div className={styles.listHeader}>
                <span>Status Legend ({statuses.length})</span>
                <button className={styles.addItemBtn} onClick={startCreateStatus}>+ Add Status</button>
              </div>

              {(creating || editing) && (
                <div className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Key</label>
                      <input value={formKey} onChange={(e) => setFormKey(e.target.value)} placeholder="e.g. my-status" disabled={!!editing} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Label</label>
                      <input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="Display name" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Background Color</label>
                      <div className={styles.colorInput}>
                        <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} />
                        <input type="text" value={formColor} onChange={(e) => setFormColor(e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Text Color</label>
                      <div className={styles.colorInput}>
                        <input type="color" value={formTextColor} onChange={(e) => setFormTextColor(e.target.value)} />
                        <input type="text" value={formTextColor} onChange={(e) => setFormTextColor(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.preview}>
                    <span style={{ background: formColor, color: formTextColor, padding: '4px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>
                      {formLabel || 'Preview'}
                    </span>
                  </div>
                  {error && <p className={styles.error}>{error}</p>}
                  <div className={styles.formActions}>
                    <button className={styles.cancelBtn} onClick={() => { setEditing(null); setCreating(false); }}>Cancel</button>
                    <button className={styles.saveBtn} onClick={saveStatus} disabled={saving}>
                      {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.itemList}>
                {statuses.map((s) => (
                  <div key={s.id} className={styles.item}>
                    <span className={styles.itemSwatch} style={{ background: s.color }} />
                    <span className={styles.itemLabel}>{s.label}</span>
                    <span className={styles.itemKey}>{s.key}</span>
                    <button className={styles.editBtn} onClick={() => startEditStatus(s)}>Edit</button>
                    <button className={styles.deleteBtn} onClick={() => deleteStatus(s.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ======== CATEGORIES TAB ======== */}
          {tab === 'categories' && (
            <>
              <div className={styles.listHeader}>
                <span>Categories</span>
                <button className={styles.addItemBtn} onClick={startCreateCat}>+ Add Category</button>
              </div>

              {(creatingCat || editingCat) && (
                <div className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Name</label>
                      <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" />
                    </div>
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: '10px' }}>
                    <label>Icon</label>
                    <IconPicker value={catIcon} onChange={setCatIcon} />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Header Color</label>
                      <div className={styles.colorInput}>
                        <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} />
                        <input type="text" value={catColor} onChange={(e) => setCatColor(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.preview}>
                    <span style={{ background: catColor, padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {(() => { const Icon = getIcon(catIcon); return <Icon size={14} />; })()}
                      {catName || 'Preview'}
                    </span>
                  </div>
                  {error && <p className={styles.error}>{error}</p>}
                  <div className={styles.formActions}>
                    <button className={styles.cancelBtn} onClick={() => { setEditingCat(null); setCreatingCat(false); }}>Cancel</button>
                    <button className={styles.saveBtn} onClick={saveCat} disabled={saving}>
                      {saving ? 'Saving...' : editingCat ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.itemList}>
                {categories.map((c) => (
                  <div key={c.id} className={styles.item}>
                    <span className={styles.itemSwatch} style={{ background: c.headerBg }} />
                    <span className={styles.itemIcon}>{(() => { const Icon = getIcon(c.icon); return <Icon size={14} />; })()}</span>
                    <span className={styles.itemLabel}>{c.name}</span>
                    <span className={styles.itemKey}>{c.mods.length} mods</span>
                    <button className={styles.editBtn} onClick={() => startEditCat(c)}>Edit</button>
                    <button className={styles.deleteBtn} onClick={() => deleteCat(c.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
