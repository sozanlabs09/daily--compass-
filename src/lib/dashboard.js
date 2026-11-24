
import { getMyTasks } from './tasks.js';
import { getMySubjects } from './subjects.js';
import { getMyBooks } from './books.js';
import { getMyHabits } from './habits.js';
import { getMyEvents } from './calendar.js';

function getTodayDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isValidArray(value) {
  return Array.isArray(value) ? value : [];
}

function isValidTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

function getTaskSummary(tasks, today) {
  const completed = tasks.filter(
    task => task.status === 'completed'
  ).length;

  const inProgress = tasks.filter(
    task => task.status === 'in_progress'
  ).length;

  const pending = tasks.filter(
    task => task.status === 'todo'
  ).length;

  const overdue = tasks.filter(task => {
    return (
      task.status !== 'completed' &&
      typeof task.due_date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(task.due_date) &&
      task.due_date < today
    );
  }).length;

  const dueToday = tasks.filter(task => {
    return (
      task.status !== 'completed' &&
      task.due_date === today
    );
  }).length;

  return {
    total: tasks.length,
    completed,
    inProgress,
    pending,
    overdue,
    dueToday
  };
}

function getBookSummary(books) {
  return {
    total: books.length,
    toRead: books.filter(book => book.status === 'to_read').length,
    reading: books.filter(book => book.status === 'reading').length,
    completed: books.filter(book => book.status === 'completed').length,
    onHold: books.filter(book => book.status === 'on_hold').length
  };
}

function getEventSummary(events, now, today) {
  const activeEvents = events.filter(
    event =>
      event &&
      event.status !== 'cancelled'
  );

  const todayEvents = activeEvents.filter(event => {
    if (!isValidTimestamp(event.start_at)) return false;

    const eventDate = new Date(event.start_at);

    return getTodayDate(eventDate) === today;
  });

  const upcomingEvents = activeEvents
    .filter(event => {
      if (
        event.status !== 'scheduled' ||
        !isValidTimestamp(event.start_at)
      ) {
        return false;
      }

      const startTime = Date.parse(event.start_at);

      if (startTime < now.getTime()) return false;

      if (
        event.end_at !== null &&
        event.end_at !== undefined &&
        isValidTimestamp(event.end_at) &&
        Date.parse(event.end_at) <= now.getTime()
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        Date.parse(a.start_at) - Date.parse(b.start_at)
    );

  return {
    total: events.length,
    today: todayEvents.length,
    upcoming: upcomingEvents.length,
    todayEvents,
    upcomingEvents: upcomingEvents.slice(0, 5)
  };
}

async function loadSection(name, loader, dataKey) {
  try {
    const result = await loader();

    if (result?.error) {
      return {
        name,
        data: [],
        error: result.error
      };
    }

    return {
      name,
      data: isValidArray(result?.[dataKey]),
      error: null
    };
  } catch (error) {
    return {
      name,
      data: [],
      error
    };
  }
}

export async function getDashboardData() {
  const now = new Date();
  const today = getTodayDate(now);

  const sections = await Promise.all([
    loadSection('tasks', getMyTasks, 'tasks'),
    loadSection('subjects', getMySubjects, 'subjects'),
    loadSection('books', getMyBooks, 'books'),
    loadSection('habits', getMyHabits, 'habits'),
    loadSection('calendar', getMyEvents, 'events')
  ]);

  const sectionResults = Object.fromEntries(
    sections.map(section => [section.name, section])
  );

  const tasks = sectionResults.tasks.data;
  const subjects = sectionResults.subjects.data;
  const books = sectionResults.books.data;
  const habits = sectionResults.habits.data;
  const events = sectionResults.calendar.data;

  const errors = sections
    .filter(section => section.error)
    .map(section => ({
      section: section.name,
      error: section.error
    }));

  return {
    data: {
      date: today,

      tasks,
      subjects,
      books,
      habits,
      events,

      summary: {
        tasks: getTaskSummary(tasks, today),

        subjects: {
          total: subjects.length
        },

        books: getBookSummary(books),

        habits: {
          total: habits.length
        },

        calendar: getEventSummary(events, now, today)
      }
    },

    errors,
    error: errors.length > 0
      ? new Error('Some dashboard sections could not be loaded.')
      : null
  };
}
