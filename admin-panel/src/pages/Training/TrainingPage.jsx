import React from 'react';
import { useTour } from '../../tour/TourProvider';
import { TOUR_SECTIONS } from '../../tour/tourSteps';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const TrainingPage = () => {
  const { enabled, setEnabled, startForPath, resetProgress } = useTour();

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Обучение</h1>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Короткие экскурсии по каждому разделу: куда нажимать, зачем и что произойдёт.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setEnabled(!enabled)}>
            {enabled ? 'Выключить подсказки' : 'Включить подсказки'}
          </Button>
          <Button variant="secondary" onClick={resetProgress}>
            Сбросить прогресс
          </Button>
        </div>
      </div>

      <Card style={{ padding: 16, marginBottom: 16, background: '#f8fafc' }}>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: '#334155' }}>
          Обучение встроено в интерфейс: на каждой странице появляется кнопка 🎓 и, если
          подсказки включены, экскурсия запускается при первом заходе. Переключатель
          «🎓 Обучение» находится в левом меню и отключает все подсказки сразу.
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 14,
        }}
      >
        {TOUR_SECTIONS.map((section) => (
          <Card key={section.key} style={{ padding: 18, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 26 }}>{section.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>{section.title}</div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
              {section.summary}
            </div>

            <ul
              style={{
                margin: '10px 0 0',
                paddingLeft: 18,
                fontSize: 13,
                color: '#334155',
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              {section.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>

            <div style={{ marginTop: 14 }}>
              <Button onClick={() => startForPath(section.path)}>
                Показать на экране
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TrainingPage;
