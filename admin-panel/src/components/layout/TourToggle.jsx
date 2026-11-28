import React from 'react';
import { useTour } from '../../tour/TourProvider';

const TourToggle = () => {
  const { enabled, setEnabled } = useTour();

  return (
    <div style={{ padding: '0 20px 12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>🎓 Обучение</div>
          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
            {enabled ? 'Экскурсии включены' : 'Экскурсии выключены'}
          </div>
        </div>

        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: 44,
            height: 24,
            flexShrink: 0,
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => setEnabled(!enabled)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: enabled ? '#22c55e' : '#64748b',
              borderRadius: 24,
              transition: '0.3s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: 18,
                width: 18,
                left: enabled ? 23 : 3,
                bottom: 3,
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: '0.3s',
              }}
            />
          </span>
        </label>
      </div>
    </div>
  );
};

export default TourToggle;
