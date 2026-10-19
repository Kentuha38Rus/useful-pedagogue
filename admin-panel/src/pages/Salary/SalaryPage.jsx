import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSalary } from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const SalaryPage = () => {
  const dispatch = useDispatch();
  const { salary, loading, error } = useSelector((state) => state.admin);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedTeacher, setExpandedTeacher] = useState(null);

  useEffect(() => {
    dispatch(fetchSalary({}));
  }, [dispatch]);

  const handleApplyFilter = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    dispatch(fetchSalary(params));
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
    dispatch(fetchSalary({}));
  };

  const toggleTeacher = (teacherId) => {
    setExpandedTeacher((prev) => (prev === teacherId ? null : teacherId));
  };

  // ------------------- ПЕЧАТЬ РАСЧЁТНОГО ЛИСТА -------------------
  const handlePrint = (teacher) => {
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
      alert('Разрешите всплывающие окна для печати');
      return;
    }

    const periodFrom = salary.period?.from || '—';
    const periodTo = salary.period?.to || 'н.в.';
    const today = new Date().toLocaleDateString('ru-RU');
    const share = ((salary.share || 0.4) * 100).toFixed(0);

    const rows = teacher.details
      .map((d) => {
        const present = d.presentStudents && d.presentStudents.length
          ? d.presentStudents.join(', ')
          : '—';
        const late = d.lateStudents && d.lateStudents.length
          ? d.lateStudents.join(', ')
          : '—';
        const absent = d.absentStudents && d.absentStudents.length
          ? d.absentStudents.join(', ')
          : '—';
        return `
          <tr>
            <td>${d.date}</td>
            <td>${(d.startTime || '').slice(0, 5)}–${(d.endTime || '').slice(0, 5)}</td>
            <td>${d.groupName}</td>
            <td>${d.courseName}</td>
            <td style="text-align:right">${d.price}</td>
            <td>${present}</td>
            <td>${late}</td>
            <td>${absent}</td>
            <td style="text-align:right">${d.salary.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="utf-8" />
        <title>Расчётный лист — ${teacher.teacherName}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Times New Roman', Arial, sans-serif;
            padding: 30px 40px;
            color: #000;
            font-size: 12px;
          }
          h1 { font-size: 18px; margin: 0 0 5px; text-align: center; }
          h2 { font-size: 13px; font-weight: normal; margin: 0 0 25px; text-align: center; color: #333; }
          .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; margin-bottom: 20px; }
          .info div { font-size: 12px; }
          .info b { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td {
            border: 1px solid #999;
            padding: 5px 6px;
            vertical-align: top;
            text-align: left;
          }
          th { background: #efefef; font-weight: 600; }
          tfoot td { font-weight: bold; background: #f8f8f8; }
          .total { margin-top: 20px; padding: 12px; border: 1px solid #999; background: #f8f8f8; font-size: 13px; }
          .total div { margin-bottom: 4px; }
          .grand { font-size: 16px; color: #000; font-weight: bold; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
          .footer div { width: 45%; }
          .signature { border-top: 1px solid #000; margin-top: 45px; padding-top: 4px; text-align: center; }
          @media print {
            body { padding: 10px 15px; }
            @page { size: A4; margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <h1>Расчётный лист по заработной плате</h1>
        <h2>Учебный центр «Полезный педагог»</h2>

        <div class="info">
          <div><b>Преподаватель:</b> ${teacher.teacherName}</div>
          <div><b>E-mail:</b> ${teacher.teacherEmail || '—'}</div>
          <div><b>Период:</b> ${periodFrom} — ${periodTo}</div>
          <div><b>Дата формирования:</b> ${today}</div>
          <div><b>Доля преподавателя:</b> ${share}%</div>
          <div><b>Проведено занятий:</b> ${teacher.lessonsCount}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:70px">Дата</th>
              <th style="width:80px">Время</th>
              <th>Группа</th>
              <th>Курс</th>
              <th style="width:60px; text-align:right">Цена</th>
              <th>Присутствовали</th>
              <th>Опоздали</th>
              <th>Отсутствовали</th>
              <th style="width:70px; text-align:right">Зарплата</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="total">
          <div>Итого занятий: <b>${teacher.lessonsCount}</b></div>
          <div>Итого присутствий: <b>${teacher.presentCount}</b></div>
          <div>Общий доход: <b>${teacher.revenue.toLocaleString('ru-RU')} ₽</b></div>
          <div class="grand">К выплате: ${teacher.salary.toLocaleString('ru-RU')} ₽</div>
        </div>

        <div class="footer">
          <div>
            <div class="signature">Подпись администратора</div>
          </div>
          <div>
            <div class="signature">Подпись преподавателя</div>
          </div>
        </div>
      </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  };
  // ----------------------------------------------------------------

  return (
    <div>
      <h1>Зарплата преподавателей</h1>

      <Card style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label>
            <div style={{ marginBottom: '5px', fontSize: '13px', color: '#555' }}>С даты:</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ padding: '8px' }}
            />
          </label>
          <label>
            <div style={{ marginBottom: '5px', fontSize: '13px', color: '#555' }}>По дату:</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ padding: '8px' }}
            />
          </label>
          <Button type="button" onClick={handleApplyFilter}>Применить</Button>
          <Button type="button" variant="default" onClick={handleReset}>Сбросить</Button>
        </div>
        <p style={{ marginTop: '10px', fontSize: '13px', color: '#888' }}>
          Процент преподавателя: <b>{(salary.share * 100).toFixed(0)}%</b>. Учитываются только
          отмеченные как «присутствовал».
        </p>
      </Card>

      {loading && <div>Загрузка...</div>}
      {error && <div style={{ color: 'red' }}>Ошибка: {error}</div>}

      {!loading && salary.teachers.length === 0 && <p>За выбранный период данных нет.</p>}

      {salary.teachers.length > 0 && (
        <>
          <Card style={{ marginBottom: '20px', padding: '20px', background: '#f0f7ff' }}>
            <div style={{ display: 'flex', gap: '40px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#555' }}>Общий доход</div>
                <div style={{ fontSize: '22px', fontWeight: 600 }}>
                  {salary.totals.revenue.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#555' }}>К выплате преподавателям</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#27ae60' }}>
                  {salary.totals.salary.toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          </Card>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ background: '#f0f2f5' }}>
                <th style={{ padding: '10px', width: '20px' }}></th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Преподаватель</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Занятий</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Присутствий</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Доход, ₽</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Зарплата, ₽</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {salary.teachers.map((t) => (
                <React.Fragment key={t.teacherId}>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td
                      style={{ padding: '10px', cursor: 'pointer' }}
                      onClick={() => toggleTeacher(t.teacherId)}
                    >
                      {expandedTeacher === t.teacherId ? '▼' : '▶'}
                    </td>
                    <td
                      style={{ padding: '10px', cursor: 'pointer' }}
                      onClick={() => toggleTeacher(t.teacherId)}
                    >
                      <b>{t.teacherName}</b>
                      {t.teacherEmail && (
                        <div style={{ fontSize: '12px', color: '#888' }}>{t.teacherEmail}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{t.lessonsCount}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{t.presentCount}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {t.revenue.toLocaleString('ru-RU')}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#27ae60',
                      }}
                    >
                      {t.salary.toLocaleString('ru-RU')}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <Button
                        type="button"
                        variant="primary"
                        size="small"
                        onClick={() => handlePrint(t)}
                      >
                        🖨 Печать
                      </Button>
                    </td>
                  </tr>

                  {expandedTeacher === t.teacherId && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ padding: '0 10px 15px 30px', background: '#fafafa' }}
                      >
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginTop: '10px',
                          }}
                        >
                          <thead>
                            <tr style={{ background: '#eee' }}>
                              <th style={{ padding: '6px', textAlign: 'left', fontSize: '12px' }}>
                                Дата
                              </th>
                              <th style={{ padding: '6px', textAlign: 'left', fontSize: '12px' }}>
                                Время
                              </th>
                              <th style={{ padding: '6px', textAlign: 'left', fontSize: '12px' }}>
                                Группа
                              </th>
                              <th style={{ padding: '6px', textAlign: 'left', fontSize: '12px' }}>
                                Курс
                              </th>
                              <th
                                style={{
                                  padding: '6px',
                                  textAlign: 'right',
                                  fontSize: '12px',
                                }}
                              >
                                Цена
                              </th>
                              <th style={{ padding: '6px', textAlign: 'left', fontSize: '12px' }}>
                                Дети (статус)
                              </th>
                              <th
                                style={{
                                  padding: '6px',
                                  textAlign: 'right',
                                  fontSize: '12px',
                                }}
                              >
                                Доход
                              </th>
                              <th
                                style={{
                                  padding: '6px',
                                  textAlign: 'right',
                                  fontSize: '12px',
                                }}
                              >
                                Зарплата
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.details.map((d, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '6px', fontSize: '12px' }}>{d.date}</td>
                                <td style={{ padding: '6px', fontSize: '12px' }}>
                                  {(d.startTime || '').slice(0, 5)}–
                                  {(d.endTime || '').slice(0, 5)}
                                </td>
                                <td style={{ padding: '6px', fontSize: '12px' }}>{d.groupName}</td>
                                <td style={{ padding: '6px', fontSize: '12px' }}>{d.courseName}</td>
                                <td
                                  style={{
                                    padding: '6px',
                                    textAlign: 'right',
                                    fontSize: '12px',
                                  }}
                                >
                                  {d.price}
                                </td>
                                <td style={{ padding: '6px', fontSize: '12px' }}>
                                  {d.presentStudents && d.presentStudents.length > 0 && (
                                    <div style={{ color: '#27ae60' }}>
                                      ✅ {d.presentStudents.join(', ')}
                                    </div>
                                  )}
                                  {d.lateStudents && d.lateStudents.length > 0 && (
                                    <div style={{ color: '#e67e22' }}>
                                      ⏰ {d.lateStudents.join(', ')}
                                    </div>
                                  )}
                                  {d.absentStudents && d.absentStudents.length > 0 && (
                                    <div style={{ color: '#c0392b' }}>
                                      ❌ {d.absentStudents.join(', ')}
                                    </div>
                                  )}
                                  {(!d.presentStudents || d.presentStudents.length === 0) &&
                                    (!d.lateStudents || d.lateStudents.length === 0) &&
                                    (!d.absentStudents || d.absentStudents.length === 0) && (
                                      <span style={{ color: '#999' }}>не отмечено</span>
                                    )}
                                </td>
                                <td
                                  style={{
                                    padding: '6px',
                                    textAlign: 'right',
                                    fontSize: '12px',
                                  }}
                                >
                                  {d.revenue.toLocaleString('ru-RU')}
                                </td>
                                <td
                                  style={{
                                    padding: '6px',
                                    textAlign: 'right',
                                    fontSize: '12px',
                                    color: '#27ae60',
                                    fontWeight: 600,
                                  }}
                                >
                                  {d.salary.toLocaleString('ru-RU')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default SalaryPage;