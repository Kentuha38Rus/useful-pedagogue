import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourses, createCourse, deleteCourse } from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const CoursesPage = () => {
  const dispatch = useDispatch();
  const { courses, loading } = useSelector((state) => state.admin);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ageMin: '',   // ← пустая строка
    ageMax: '',   // ← пустая строка
    price: '',    // ← пустая строка
  });

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      ageMin: formData.ageMin === '' ? 3 : parseInt(formData.ageMin, 10),
      ageMax: formData.ageMax === '' ? 7 : parseInt(formData.ageMax, 10),
      price: formData.price === '' ? 0 : parseFloat(formData.price),
    };
    await dispatch(createCourse(payload));
    setShowForm(false);
    setFormData({ name: '', description: '', ageMin: '', ageMax: '', price: '' });
  };

  const handleDelete = (id) => {
    if (confirm('Удалить курс?')) dispatch(deleteCourse(id));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Курсы</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Создать курс'}
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: '20px', padding: '20px' }}>
          <form onSubmit={handleSubmit}>
            <Input
              placeholder="Введите название курса"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              placeholder="Краткое описание (до 500 символов)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Input
                type="number"
                placeholder="Минимальный возраст (лет)"
                value={formData.ageMin}
                onChange={(e) => setFormData({ ...formData, ageMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Максимальный возраст (лет)"
                value={formData.ageMax}
                onChange={(e) => setFormData({ ...formData, ageMax: e.target.value })}
              />
            </div>
            <Input
              type="number"
              placeholder="Цена в рублях, например 1500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Button type="submit">Сохранить</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {courses.map(course => (
            <Card key={course.id} style={{ padding: '15px' }}>
              <h3>{course.name}</h3>
              <p>{course.description}</p>
              <p>Возраст: {course.ageMin}–{course.ageMax} лет</p>
              <p>Цена: {course.price} ₽</p>
              <p>Групп: {course.groups?.length || 0}</p>
              <Button variant="danger" onClick={() => handleDelete(course.id)}>Удалить</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;