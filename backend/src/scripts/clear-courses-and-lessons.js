/**
 * Очистка БД от курсов, групп, занятий и посещаемости.
 *
 * Запуск:
 *   node src/scripts/clear-courses-and-lessons.js
 *   node src/scripts/clear-courses-and-lessons.js --keep-groups
 *   node src/scripts/clear-courses-and-lessons.js --dry-run
 *
 * Флаги:
 *   --keep-groups  — не удалять группы, только обнулить у них courseId.
 *                    Занятия и посещаемость всё равно удаляются.
 *   --dry-run      — показать, сколько записей будет затронуто, и выйти.
 *
 * ВНИМАНИЕ: операция необратима. Перед запуском на проде сделайте дамп:
 *   pg_dump -U pedagogue -h localhost useful_pedagogue > backup.sql
 */

require('dotenv').config();

require('dotenv').config();

// 🔥 Защита от случайного запуска в prod
if (
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_DANGEROUS_SCRIPTS !== '1'
) {
  console.error(
    '\n❌ Отказ: NODE_ENV=production. Этот скрипт удаляет данные.\n' +
    'Если действительно нужно — запустите с ALLOW_DANGEROUS_SCRIPTS=1\n'
  );
  process.exit(1);
}

const {
  sequelize,
  Course,
  Group,
  Lesson,
  Attendance,
  ChildGroup,
} = require('../models');

const args = process.argv.slice(2);
const KEEP_GROUPS = args.includes('--keep-groups');
const DRY_RUN = args.includes('--dry-run');

async function run() {
  const transaction = await sequelize.transaction();

  try {
    // --- 1. Считаем, что будет затронуто ---
    const counts = {
      attendance: await Attendance.count({ transaction }),
      lessons: await Lesson.count({ transaction }),
      childGroups: await ChildGroup.count({ transaction }),
      groups: await Group.count({ transaction }),
      courses: await Course.count({ transaction }),
    };

    console.log('Найдено записей:');
    console.log(`  Attendance:  ${counts.attendance}`);
    console.log(`  Lesson:      ${counts.lessons}`);
    console.log(`  ChildGroup:  ${counts.childGroups}`);
    console.log(`  Group:       ${counts.groups}`);
    console.log(`  Course:      ${counts.courses}`);
    console.log(`  Режим:       ${KEEP_GROUPS ? 'KEEP_GROUPS' : 'FULL DELETE'}`);

    if (DRY_RUN) {
      console.log('\n[dry-run] Изменения не применялись.');
      await transaction.rollback();
      return;
    }

    // --- 2. Удаляем в правильном порядке ---
    const deletedAttendance = await Attendance.destroy({
      where: {},
      transaction,
    });

    const deletedLessons = await Lesson.destroy({
      where: {},
      transaction,
    });

    let deletedGroups = 0;
    let updatedGroups = 0;

    if (KEEP_GROUPS) {
      // Отвязываем группы от курсов, но оставляем сами группы
      [updatedGroups] = await Group.update(
        { courseId: null },
        { where: {}, transaction }
      );
    } else {
      // Полная очистка: сначала join-таблица, потом группы
      await ChildGroup.destroy({ where: {}, transaction });
      deletedGroups = await Group.destroy({ where: {}, transaction });
    }

    const deletedCourses = await Course.destroy({
      where: {},
      transaction,
    });

    await transaction.commit();

    console.log('\nГотово. Удалено/обновлено:');
    console.log(`  Attendance:  ${deletedAttendance}`);
    console.log(`  Lesson:      ${deletedLessons}`);
    if (KEEP_GROUPS) {
      console.log(`  Group:       обновлено (courseId = NULL): ${updatedGroups}`);
    } else {
      console.log(`  ChildGroup:  ${counts.childGroups}`);
      console.log(`  Group:       ${deletedGroups}`);
    }
    console.log(`  Course:      ${deletedCourses}`);
  } catch (err) {
    await transaction.rollback();
    console.error('Ошибка очистки, транзакция откачена:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();