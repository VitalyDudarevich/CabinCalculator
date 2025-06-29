# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ - Чеклист

✅ **Ваш бэкенд работает**: https://cabincalculator.onrender.com

## Что нужно сделать СЕЙЧАС:

### ✅ 1. Проверьте health endpoint

Откройте: **https://cabincalculator.onrender.com/health**

Должен показать JSON с информацией о MongoDB подключении.

### ✅ 2. Настройте фронтенд в Vercel

1. Зайдите в [Vercel](https://vercel.com) → ваш проект → Settings → Environment Variables
2. Добавьте переменную:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://cabincalculator.onrender.com`
3. Нажмите "Redeploy" в разделе Deployments

❗ **Это самое важное! Без этой переменной фронтенд не знает где искать API.**

### ✅ 3. Проверьте переменные окружения в Render

Зайдите в панель Render → ваш сервис → Environment и убедитесь, что есть:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/calculator
JWT_SECRET=любая_случайная_строка_минимум_32_символа
ALLOWED_ORIGINS=https://glass-calculator-bg.vercel.app
```

❗ **Если переменных нет - добавьте их и нажмите "Manual Deploy"**

### ✅ 4. Настройте MongoDB (если еще не сделано)

1. Перейдите на [MongoDB Atlas](https://cloud.mongodb.com/)
2. Создайте бесплатный кластер
3. Database Access → Add new user (запомните username/password)
4. Network Access → Add IP Address → `0.0.0.0/0` (Allow access from anywhere)
5. Connect → Connect your application → скопируйте connection string
6. Замените `<username>`, `<password>` и вставьте в `MONGODB_URI` в Render

### ✅ 5. Проверьте работоспособность

1. **Бэкенд**: откройте https://cabincalculator.onrender.com/health

   - Должен показать JSON с информацией о сервере

2. **Фронтенд**: откройте ваш сайт на Vercel
   - Откройте DevTools (F12) → Network
   - Попробуйте войти или загрузить данные
   - API запросы должны идти на `cabincalculator.onrender.com` и возвращать 200 OK

### 🧪 Дополнительно: Запустите тест API

Откройте файл `test-api.html` в браузере для полной диагностики API.

## 🔧 Если что-то не работает:

### Бэкенд не отвечает на /health

- Проверьте logs в Render (может быть ошибка подключения к MongoDB)
- Убедитесь, что все переменные окружения добавлены

### CORS ошибки

- Проверьте, что `ALLOWED_ORIGINS` в Render содержит: `https://glass-calculator-bg.vercel.app`
- Может понадобиться добавить и `http://localhost:3000` для тестирования

### Фронтенд делает запросы на localhost

- ❗ **Главная проблема**: убедитесь, что `VITE_API_URL=https://cabincalculator.onrender.com` добавлена в Vercel
- Пересоберите проект в Vercel после добавления переменной

### API возвращает 500 ошибки

- Проверьте подключение к MongoDB в переменной `MONGODB_URI`
- Посмотрите logs в панели Render

## ⏱️ Особенности Render

- **Холодный старт**: первый запрос может занимать 30-60 секунд
- **Sleep mode**: на бесплатном тарифе сервис засыпает после неактивности
- **Logs**: проверяйте в реальном времени в панели Render

## 🎯 Самая вероятная проблема:

Фронтенд до сих пор делает запросы на `localhost:5000` вместо `https://cabincalculator.onrender.com`

**Решение**: добавьте `VITE_API_URL=https://cabincalculator.onrender.com` в Vercel и пересоберите!

После выполнения всех шагов ваше приложение должно заработать! 🎉
