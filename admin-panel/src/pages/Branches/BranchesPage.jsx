import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const emptyForm = { name: '', address: '', phone: '' };

const BranchesPage = () => {
  const dispatch = useDispatch();
  const { branches } = useSelector((state) => state.admin);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchBranches());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setError('');
    setFormOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setFormData({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setError('');
    setFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (!name) {
      setError('Укажите название филиала');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name,
        address: formData.address.trim(),
        phone: formData.phone.trim(),
      };
      if (editing) {
        await dispatch(
          updateBranch({ id: editing.id, branchData: payload })
        ).unwrap();
      } else {
        await dispatch(createBranch(payload)).unwrap();
      }
      setFormOpen(false);
      dispatch(fetchBranches());
    } catch (err) {
      setError(
        typeof err === 'string' ? err : 'Не удалось сохранить филиал'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch) => {
    if (!window.confirm(`Удалить филиал «${branch.name}»?`)) return;
    try {
      await dispatch(deleteBranch(branch.id)).unwrap();
      dispatch(fetchBranches());
    } catch (err) {
      window.alert(
        typeof err === 'string' ? err : 'Не удалось удалить филиал'
      );
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Филиалы</h1>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Филиал указывается у группы. Занятия, дети и напоминания
            наследуют его автоматически.
          </div>
        </div>
        <Button onClick={openCreate}>+ Добавить филиал</Button>
      </div>

      {(!branches || branches.length === 0) && (
        <Card style={{ padding: 20, color: '#64748b' }}>
          Филиалов пока нет. Добавьте первый — без него нельзя создать группу.
        </Card>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {(branches || []).map((branch) => (
          <Card key={branch.id} style={{ padding: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {branch.name}
                  {!branch.isActive && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: '#b91c1c',
                        fontWeight: 600,
                      }}
                    >
                      неактивен
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  {branch.address || 'Адрес не указан'}
                  {branch.phone ? ` · ${branch.phone}` : ''}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Групп: {branch.groupsCount ?? 0}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button variant="secondary" onClick={() => openEdit(branch)}>
                  Изменить
                </Button>
                <Button variant="danger" onClick={() => handleDelete(branch)}>
                  Удалить
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {formOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => !saving && setFormOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              background: '#fff',
              borderRadius: 12,
              padding: 20,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              {editing ? 'Изменить филиал' : 'Новый филиал'}
            </h3>

            {error && (
              <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              <Input
                placeholder="Название (например, «На Ленина»)"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
              <Input
                placeholder="Адрес"
                value={formData.address}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Телефон"
                value={formData.phone}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 16,
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Отмена
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesPage;
