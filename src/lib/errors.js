
const ERROR_MESSAGES = Object.freeze({
  en: Object.freeze({
    GENERAL: 'Something went wrong. Please try again.',
    NETWORK: 'Connection problem. Check your internet connection.',
    UNAUTHORIZED: 'Please sign in to continue.',
    INVALID_CREDENTIALS: 'The email or password is incorrect.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested item could not be found.',
    VALIDATION: 'Please check the information you entered.',
    LIMIT_REACHED: 'You have reached your current plan limit.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
    DUPLICATE: 'This item already exists.',
    CONFIGURATION: 'The application is not configured yet.',
    UNKNOWN: 'An unexpected error occurred.'
  }),

  ar: Object.freeze({
    GENERAL: 'حدث خطأ غير متوقع. حاولي مرة أخرى.',
    NETWORK: 'مشكلة في الاتصال. تحققي من الإنترنت.',
    UNAUTHORIZED: 'سجّلي الدخول للمتابعة.',
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    FORBIDDEN: 'ليس لديكِ صلاحية لتنفيذ هذا الإجراء.',
    NOT_FOUND: 'العنصر المطلوب غير موجود.',
    VALIDATION: 'يرجى مراجعة البيانات المدخلة.',
    LIMIT_REACHED: 'وصلتِ إلى الحد المسموح به في خطتك الحالية.',
    SESSION_EXPIRED: 'انتهت جلسة الدخول. سجّلي الدخول مرة أخرى.',
    DUPLICATE: 'هذا العنصر موجود بالفعل.',
    CONFIGURATION: 'التطبيق لم يكتمل إعداده بعد.',
    UNKNOWN: 'حدث خطأ غير معروف.'
  })
});

function getLanguage(language = 'en') {
  return language === 'ar' ? 'ar' : 'en';
}

function getErrorCategory(error) {
  if (!error) return 'UNKNOWN';

  const code =
    typeof error.code === 'string'
      ? error.code.toUpperCase()
      : '';

  const status = Number(error.status);

  if (
    code === '23505' ||
    code === 'PGRST116'
  ) {
    return code === '23505' ? 'DUPLICATE' : 'NOT_FOUND';
  }

  if (
    code === 'INVALID_LOGIN_CREDENTIALS' ||
    code === 'INVALID_CREDENTIALS'
  ) {
    return 'INVALID_CREDENTIALS';
  }

  if (status === 401 || code === '401') {
    return 'UNAUTHORIZED';
  }

  if (status === 403 || code === '403') {
    return 'FORBIDDEN';
  }

  if (status === 404 || code === '404') {
    return 'NOT_FOUND';
  }

  if (
    code === 'NETWORK_ERROR' ||
    error.name === 'TypeError'
  ) {
    return 'NETWORK';
  }

  return 'UNKNOWN';
}

export function getErrorMessage(error, language = 'en') {
  const selectedLanguage = getLanguage(language);
  const messages = ERROR_MESSAGES[selectedLanguage];

  const category = getErrorCategory(error);

  return messages[category] || messages.UNKNOWN;
}

export function createAppError(
  message,
  code = 'UNKNOWN'
) {
  const error = new Error(
    typeof message === 'string'
      ? message
      : 'Application error'
  );

  error.code =
    typeof code === 'string'
      ? code
      : 'UNKNOWN';

  return error;
}

export function getErrorMessages(language = 'en') {
  return ERROR_MESSAGES[getLanguage(language)];
}
