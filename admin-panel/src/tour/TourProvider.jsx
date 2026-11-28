import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { findSectionByKey, findSectionByPath } from './tourSteps';

const TourContext = createContext(null);

const ENABLED_KEY = 'adminTourEnabled';
const SEEN_KEY = 'adminTourSeen';

const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
};

const writeSeen = (map) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch (_) {
    /* localStorage может быть недоступен */
  }
};

export const useTour = () =>
  useContext(TourContext) || {
    enabled: false,
    setEnabled: () => {},
    start: () => {},
    startForPath: () => {},
    stop: () => {},
    resetProgress: () => {},
  };

const TourOverlay = ({ section, step, stepIndex, rect, onNext, onPrev, onStop }) => {
  const width = 360;
  const total = section.steps.length;
  const isLast = stepIndex === total - 1;

  let top;
  let left;
  if (rect) {
    const estimated = 270;
    const below = rect.bottom + 14;
    top =
      below + estimated < window.innerHeight
        ? below
        : Math.max(12, rect.top - estimated - 14);
    left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12
    );
  } else {
    top = Math.max(12, (window.innerHeight - 280) / 2);
    left = Math.max(12, (window.innerWidth - width) / 2);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2100 }}
      onClick={() => onStop()}
    >
      {rect ? (
        <div
          style={{
            position: 'fixed',
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            borderRadius: 12,
            border: '2px solid #60a5fa',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
            pointerEvents: 'none',
            transition: 'all .2s ease',
          }}
        />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)' }} />
      )}

      <div
        style={{
          position: 'fixed',
          top,
          left,
          width,
          zIndex: 2102,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.4)',
          overflow: 'hidden',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            color: '#fff',
            padding: '12px 16px',
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.85 }}>
            {section.icon} {section.title} · шаг {stepIndex + 1} из {total}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>
            {step.title}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
            {step.body}
          </div>

          <div
            style={{
              height: 4,
              borderRadius: 4,
              background: '#e2e8f0',
              marginTop: 14,
            }}
          >
            <div
              style={{
                height: 4,
                borderRadius: 4,
                width: `${((stepIndex + 1) / total) * 100}%`,
                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                transition: 'width .25s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 14,
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => onStop()}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Пропустить
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={onPrev}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Назад
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {isLast ? 'Готово' : 'Далее'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TourProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [enabled, setEnabledState] = useState(() => {
    try {
      return localStorage.getItem(ENABLED_KEY) !== '0';
    } catch (_) {
      return true;
    }
  });
  const [activeKey, setActiveKey] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [pendingKey, setPendingKey] = useState(null);

  const section = activeKey ? findSectionByKey(activeKey) : null;
  const step = section ? section.steps[stepIndex] : null;
  const currentSection = findSectionByPath(location.pathname);

  const markSeen = useCallback((key) => {
    if (!key) return;
    const seen = readSeen();
    seen[key] = true;
    writeSeen(seen);
  }, []);

  const start = useCallback((key) => {
    const target = findSectionByKey(key);
    if (!target) return;
    setActiveKey(key);
    setStepIndex(0);
    setRect(null);
  }, []);

  const stop = useCallback(
    (mark = true) => {
      if (mark && activeKey) markSeen(activeKey);
      setActiveKey(null);
      setStepIndex(0);
      setRect(null);
      setPendingKey(null);
    },
    [activeKey, markSeen]
  );

  const next = useCallback(() => {
    if (!section) return;
    if (stepIndex >= section.steps.length - 1) {
      stop(true);
    } else {
      setStepIndex((value) => value + 1);
    }
  }, [section, stepIndex, stop]);

  const prev = useCallback(() => {
    setStepIndex((value) => Math.max(0, value - 1));
  }, []);

  const startForPath = useCallback(
    (path) => {
      const target = findSectionByPath(path);
      if (!target) return;
      if (location.pathname === path) {
        start(target.key);
      } else {
        setPendingKey(target.key);
        navigate(path);
      }
    },
    [location.pathname, navigate, start]
  );

  const setEnabled = useCallback(
    (value) => {
      try {
        localStorage.setItem(ENABLED_KEY, value ? '1' : '0');
      } catch (_) {
        /* noop */
      }
      setEnabledState(value);
      if (!value) {
        setActiveKey(null);
        setStepIndex(0);
        setPendingKey(null);
      } else if (currentSection) {
        setActiveKey(currentSection.key);
        setStepIndex(0);
      }
    },
    [currentSection]
  );

  const resetProgress = useCallback(() => {
    writeSeen({});
    setActiveKey(null);
    setStepIndex(0);
  }, []);

  // Автозапуск экскурсии на странице, которую ещё не проходили
  useEffect(() => {
    if (!enabled || activeKey || pendingKey) return undefined;
    const target = findSectionByPath(location.pathname);
    if (!target) return undefined;
    if (readSeen()[target.key]) return undefined;
    const timer = setTimeout(() => {
      setActiveKey(target.key);
      setStepIndex(0);
    }, 900);
    return () => clearTimeout(timer);
  }, [enabled, location.pathname, activeKey, pendingKey]);

  // Переход на страницу для экскурсии из справочника
  useEffect(() => {
    if (!pendingKey) return undefined;
    const target = findSectionByKey(pendingKey);
    if (target && location.pathname === target.path) {
      const timer = setTimeout(() => {
        setActiveKey(pendingKey);
        setStepIndex(0);
        setPendingKey(null);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pendingKey, location.pathname]);

  // Измерение подсвечиваемого элемента
  useEffect(() => {
    if (!step) {
      setRect(null);
      return undefined;
    }

    let element = null;
    try {
      element = step.target ? step.target() : null;
    } catch (_) {
      element = null;
    }

    if (!element) {
      setRect(null);
      return undefined;
    }

    try {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (_) {
      /* noop */
    }

    const measure = () => {
      try {
        setRect(element.getBoundingClientRect());
      } catch (_) {
        setRect(null);
      }
    };

    const timer = setTimeout(measure, 420);
    // Страницы с загрузкой данных: элементы могут появиться позже
    const lateTimer = setTimeout(measure, 1300);
    const lateTimer2 = setTimeout(measure, 2500);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(timer);
      clearTimeout(lateTimer);
      clearTimeout(lateTimer2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, activeKey, stepIndex]);

  // Клавиатура
  useEffect(() => {
    if (!section) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') stop(true);
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [section, next, prev, stop]);

  const value = {
    enabled,
    setEnabled,
    start,
    startForPath,
    stop,
    resetProgress,
    activeKey,
  };

  return (
    <TourContext.Provider value={value}>
      {children}

      {section && step && (
        <TourOverlay
          section={section}
          step={step}
          stepIndex={stepIndex}
          rect={rect}
          onNext={next}
          onPrev={prev}
          onStop={stop}
        />
      )}

      {enabled && !section && currentSection && (
        <button
          type="button"
          onClick={() => start(currentSection.key)}
          title={`Обучение: ${currentSection.title}`}
          style={{
            position: 'fixed',
            right: 22,
            bottom: 22,
            zIndex: 1500,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: '#fff',
            fontSize: 22,
            cursor: 'pointer',
            boxShadow: '0 10px 24px rgba(37, 99, 235, 0.45)',
          }}
        >
          🎓
        </button>
      )}
    </TourContext.Provider>
  );
};
