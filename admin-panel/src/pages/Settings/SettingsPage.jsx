import React, { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

// Список поясов России. При добавлении стран — дополнять здесь.
const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
];

const formatClock = (timeZone) => {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  } catch (_) {
    return '—';
  }
};

const formatDate = (timeZone) => {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  } catch (_) {
    return '—';
  }
};

const SettingsPage = () => {
  const [timezone, setTimezone] = useState('Asia/Irkutsk');
  const [savedTimezone, setSavedTimezone] = useState('Asia/Irkutsk');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tick, setTick] = useState(0);

  const browserTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (_) {
      return null;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data } = await api.get('/admin/settings');
        if (!active) return;
        setTimezone(data.timezone || 'Asia/Irkutsk');
        setSavedTimezone(data.timezone || 'Asia/Irkutsk');
      } catch (e) {
        if (active) {
          setError(
            e.response?.data?.message || 'Не удалось загрузить настройки'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.patch('/admin/settings', { timezone });
      setSavedTimezone(data.timezone || timezone);
      setSuccess('Сохранено. Новое время начнёт действовать в течение 5 минут.');
    } catch (e) {
      setError(
        e.response?.data?.message || 'Не удалось сохранить настройку'
      );
    } finally {
      setSaving(false);
    }
  };

  const isKnownZone = TIMEZONES.some((zone) => zone.value === timezone);

  // tick обновляет часы раз в 30 секунд
  const clock = useMemo(() => formatClock(timezone), [timezone, tick]);
  const todayLabel = useMemo(() => formatDate(timezone), [timezone, tick]);

  return (
    <div style={{ padding: '8px 4px', maxWidth: 720 }}>
      <h1 style={{ marginTop: 0 }}>Настройки центра</h1>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Часовой пояс</h3>

        <p style={{ color: '#475569', fontSize: 14, marginTop: 0 }}>
          По этому поясу считаются автонапоминания «за час», статусы занятий
          и дата «сегодня» в админке. Сервер работает по UTC, поэтому без
          настройки время уезжает.
        </p>

        {loading ? (
          <div style={{ color: '#64748b' }}>Загрузка...</div>
        ) : (
          <>
            <select
              value={timezone}
              onChange={(event) => {
                setTimezone(event.target.value);
                setSuccess('');
                setError('');
              }}
              style={{
                width: '100%',
                maxWidth: 360,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                background: '#fff',
              }}
            >
              {!isKnownZone && (
                <option value={timezone}>{timezone}</option>
              )}
              {TIMEZONES.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>

            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 10,
                background: '#f1f5f9',
                fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                Сейчас в центре: {clock}
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                {todayLabel} · {timezone}
              </div>
            </div>

            {browserTimezone && browserTimezone !== timezone && (
              <button
                type="button"
                onClick={() => {
                  setTimezone(browserTimezone);
                  setSuccess('');
                  setError('');
                }}
                style={{
                  marginTop: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#2563eb',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 13,
                  textDecoration: 'underline',
                }}
              >
                Подставить пояс этого компьютера ({browserTimezone})
              </button>
            )}

            {error && (
              <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ marginTop: 10, color: '#15803d', fontSize: 13 }}>
                ✅ {success}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || timezone === savedTimezone}
              style={{
                marginTop: 16,
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background:
                  saving || timezone === savedTimezone ? '#cbd5e1' : '#2563eb',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  saving || timezone === savedTimezone
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </>
        )}
      </div>

      <div
        style={{
          marginTop: 14,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#fff7ed',
          color: '#9a3412',
          fontSize: 13,
        }}
      >
        Если время в центре не совпадает с часами на стене — поправьте пояс
        здесь. Прошедшие уведомления не пересчитываются.
      </div>
    </div>
  );
};

export default SettingsPage;
